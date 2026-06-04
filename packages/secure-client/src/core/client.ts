import type {
  NetworkStatusResolver,
  SovereignClientCoreConfig,
  SovereignRequestConfig,
  QueuedRequestRecord,
} from '../types.js';
import type { ISovereignCryptoProvider, ISovereignNetworkAdapter, SovereignAdapterRequest } from '../contracts/index.js';
import { SovereignMemoryQueue } from '../ledger/index.js';
import { resolveTrappingConfig, type ResolvedTrappingConfig } from './config.js';
import { shouldFreezeSession } from './error-matrix.js';
import { serializeAdapterRequest, deserializeAdapterRequest } from '../binary.js';

/**
 * SovereignClientCore
 *
 * The global-singleton orchestrator of the SovereignCore framework.
 *
 * Singleton Contract:
 * Only one instance exists per JS runtime. Call SovereignClientCore.getInstance(config).
 *
 * ── Memory-Safety Architecture ───────────────────────────────────────────────
 *
 * STRUCTURED PATH — executeRequest() [PREFERRED, fully zeroizable]
 * ───────────────────────────────────────────────────────────────
 * Accepts a SovereignAdapterRequest whose body and headers are already
 * encoded as Uint8Array buffers (via encodeJsonBody / encodeHeaders).
 *
 * When the request must be queued (offline or 503/504):
 *   1. serializeAdapterRequest() packs the full request into one Uint8Array.
 *   2. That buffer is stored in LedgerBlock.serializedRequest.
 *   3. The `pendingRequests` map stores ONLY (resolve, reject) — zero payload.
 *   4. On TTL expiry / purge: zeroizeBlock() overwrites the buffer with 0x00.
 *      The pending Promise is then rejected — no sensitive bytes remain.
 *   5. On queue drain: deserializeAdapterRequest() reconstructs the request
 *      transiently; the networkAdapter executes it; the buffer is then dequeued
 *      and zeroized immediately.
 *
 * CLOSURE PATH — execute() [LEGACY, NOT fully zeroizable]
 * ────────────────────────────────────────────────────────
 * Retained for backward compatibility. Closures may capture sensitive payload
 * data as plain-text strings in the V8/JSCore heap. Calling executors.clear()
 * removes references but does NOT overwrite the captured strings. Migrate to
 * executeRequest() + networkAdapter for any security-critical code path.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class SovereignClientCore {
  private static instance: SovereignClientCore;

  private readonly memoryQueue: SovereignMemoryQueue;
  private readonly cryptoProvider: ISovereignCryptoProvider;
  private readonly isOnline: NetworkStatusResolver;
  private readonly defaultTTL: number;
  private readonly trapping: ResolvedTrappingConfig;
  private readonly networkAdapter: ISovereignNetworkAdapter | undefined;

  private isProcessingQueue = false;

  /**
   * Structured pending-request registry (executeRequest path).
   *
   * Stores ONLY resolve/reject callbacks — zero transactional payload.
   * All sensitive data lives in LedgerBlock.serializedRequest (Uint8Array)
   * and is byte-level zeroized on expiry or purge.
   */
  private readonly pendingRequests = new Map<string, QueuedRequestRecord<unknown>>();

  /**
   * Legacy closure registry (execute path).
   *
   * @deprecated Closures stored here may capture sensitive data as plain-text
   * strings in the JS heap that cannot be byte-level zeroized on purge.
   * Retained for backward compatibility only.
   */
  private readonly executors = new Map<string, () => Promise<unknown>>();

  private constructor(config: SovereignClientCoreConfig) {
    this.cryptoProvider = config.cryptoProvider;
    this.isOnline       = config.networkResolver;
    this.defaultTTL     = config.defaultTTL ?? 60_000;
    this.memoryQueue    = SovereignMemoryQueue.getInstance();
    this.trapping       = resolveTrappingConfig(config.errorTrapping);
    this.networkAdapter = config.networkAdapter;
  }

  public static getInstance(config: SovereignClientCoreConfig): SovereignClientCore {
    if (!SovereignClientCore.instance) {
      SovereignClientCore.instance = new SovereignClientCore(config);
    }
    return SovereignClientCore.instance;
  }

  // ── Structured path (fully zeroizable) ─────────────────────────────────────

  /**
   * executeRequest — the fully zeroizable execution path.
   *
   * Accepts a structured SovereignAdapterRequest instead of an opaque closure.
   * All sensitive fields (body, encodedHeaders) must be Uint8Array buffers
   * produced by the encoding helpers:
   *   - body:           encodeJsonBody(obj) | encodeTextBody(str)
   *   - encodedHeaders: encodeHeaders({ Authorization: token })
   *
   * When queued, the complete request is packed into a single binary buffer
   * stored in the LedgerBlock. No closure is created — no heap capture occurs.
   * The `networkAdapter` config field is required for this path.
   *
   * @param requestId  Stable correlation ID (used as LedgerBlock key).
   * @param request    Fully binary-encoded HTTP request descriptor.
   * @param config     Per-request TTL override.
   */
  public async executeRequest<T>(
    requestId: string,
    request: SovereignAdapterRequest,
    config?: SovereignRequestConfig,
  ): Promise<T> {
    if (!this.networkAdapter) {
      throw new Error(
        '[SovereignCore] executeRequest() requires a networkAdapter in the config. ' +
        'Pass networkAdapter: new FetchAdapter() (or equivalent) to getInstance().'
      );
    }

    const online = await this.isOnline();

    if (online && !this.isProcessingQueue) {
      try {
        const response = await this.networkAdapter.request<T>(request);
        return response.data;
      } catch (error) {
        if (shouldFreezeSession(error, this.trapping)) {
          return this.enqueueStructuredRequest<T>(requestId, request, config);
        }
        throw error;
      }
    }

    return this.enqueueStructuredRequest<T>(requestId, request, config);
  }

  // ── Legacy closure path ─────────────────────────────────────────────────────

  /**
   * execute — legacy closure-based execution.
   *
   * @deprecated Use executeRequest() + networkAdapter for all security-critical
   * code paths. Closures passed here may capture sensitive request data
   * (bodies, tokens, headers) as plain-text strings in the JS heap. Those
   * strings cannot be byte-level zeroized when the session is purged.
   *
   * Retained for backward compatibility with GraphQL clients, Apollo, and
   * other transport adapters that cannot be expressed as SovereignAdapterRequest.
   */
  public async execute<T>(
    requestId: string,
    executor: () => Promise<T>,
    metaData: object,
    config?: SovereignRequestConfig
  ): Promise<T> {
    const online = await this.isOnline();

    if (online && !this.isProcessingQueue) {
      try {
        return await executor();
      } catch (error) {
        if (shouldFreezeSession(error, this.trapping)) {
          return this.enqueueForRetry(requestId, executor, metaData, config);
        }
        throw error;
      }
    }

    return this.enqueueForRetry(requestId, executor, metaData, config);
  }

  // ── Queue processing ────────────────────────────────────────────────────────

  public async processSynchronizedQueue(
    handshakeValidator: () => Promise<boolean>
  ): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      const isChannelValid = await handshakeValidator();
      if (!isChannelValid) {
        this.purgeAll();
        throw new Error('[SovereignCore] Handshake failed. Hostile network. RAM purged.');
      }

      const isLedgerIntact = await this.memoryQueue.verifyLedgerIntegrity(
        this.cryptoProvider
      );
      if (!isLedgerIntact) {
        this.purgeAll();
        throw new Error('[SovereignCore] Ledger integrity compromised. RAM purged.');
      }

      const executionOrder = this.memoryQueue.getExecutionOrder();

      for (const id of executionOrder) {
        const block = this.memoryQueue.getPayload(id);
        if (!block) continue;

        // ── Structured path: reconstruct request from binary buffer ──────────
        if (this.pendingRequests.has(id) && this.networkAdapter) {
          const pending = this.pendingRequests.get(id)!;
          try {
            // Deserialize the request from the LedgerBlock binary buffer.
            // The returned object is transient — used once and then released.
            const deserialized = deserializeAdapterRequest(block.serializedRequest);

            if (!deserialized) {
              // Buffer was already zeroized — skip without re-queuing.
              pending.reject(new Error(
                `[SovereignCore] Transaction [${id}] binary buffer was zeroized before replay.`
              ));
              this.pendingRequests.delete(id);
              await this.memoryQueue.dequeue(this.cryptoProvider, id);
              continue;
            }

            const response = await this.networkAdapter.request<unknown>(deserialized);

            // Dequeue immediately: zeroizeBlock() runs here, wiping serializedRequest.
            await this.memoryQueue.dequeue(this.cryptoProvider, id);
            this.pendingRequests.delete(id);

            pending.resolve(response.data);
          } catch (err) {
            pending.reject(err);
            break;
          }
          continue;
        }

        // ── Legacy path: invoke stored closure ───────────────────────────────
        try {
          const trigger = this.executors.get(id);
          if (trigger) await trigger();

          await this.memoryQueue.dequeue(this.cryptoProvider, id);
          this.executors.delete(id);
        } catch {
          break;
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Enqueues a structured request into the binary LedgerBlock.
   *
   * The full SovereignAdapterRequest is serialized to Uint8Array and stored
   * exclusively in LedgerBlock.serializedRequest. The `pendingRequests` map
   * receives only the Promise resolve/reject handles — no payload.
   */
  private enqueueStructuredRequest<T>(
    id: string,
    request: SovereignAdapterRequest,
    config?: SovereignRequestConfig,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ttl = config?.ttl ?? this.defaultTTL;

      // Serialize the complete request — including body and headers — into one
      // binary buffer. This is the only location where sensitive data is stored.
      const binaryRequest = serializeAdapterRequest(request);

      const onExpiry = (expiredId: string): void => {
        // LedgerBlock is already being zeroized by the queue's expiry handler.
        // We only need to clean up the promise registry and reject the caller.
        const pending = this.pendingRequests.get(expiredId);
        if (pending) {
          pending.reject(new Error(
            `[SovereignCore] Transaction [${expiredId}] expired inside RAM boundary.`
          ));
          this.pendingRequests.delete(expiredId);
        }
      };

      this.memoryQueue
        .enqueue(this.cryptoProvider, id, binaryRequest, ttl, onExpiry)
        .then(() => {
          // Store ONLY the promise handles — no closure over `request`.
          // The `request` object (and its body/header Uint8Arrays) may be
          // released by the caller immediately after this call returns.
          this.pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject });
        })
        .catch(reject);
    });
  }

  /**
   * Enqueues a legacy closure-based executor.
   *
   * @deprecated The executor closure may capture sensitive data in the heap.
   */
  private enqueueForRetry<T>(
    id: string,
    executor: () => Promise<T>,
    metaData: object,
    config?: SovereignRequestConfig
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ttl = config?.ttl ?? this.defaultTTL;
      const serializedData = new TextEncoder().encode(JSON.stringify(metaData));

      const onExpiry = (expiredId: string): void => {
        this.executors.delete(expiredId);
        reject(
          new Error(
            `[SovereignCore] Transaction [${expiredId}] expired inside RAM boundary.`
          )
        );
      };

      this.memoryQueue
        .enqueue(this.cryptoProvider, id, serializedData, ttl, onExpiry)
        .then(() => {
          this.executors.set(id, async () => {
            const result = await executor();
            resolve(result);
          });
        })
        .catch(reject);
    });
  }

  /**
   * Purges all in-flight state unconditionally.
   *
   * Structured path: LedgerBlock buffers are byte-level zeroized by
   * `memoryQueue.clearAll()` → `zeroizeBlock()` → `.fill(0)`.
   * Pending Promises are then rejected with a purge error.
   *
   * Legacy path: closure references are dropped. The JS engine's GC will
   * eventually reclaim the closure objects, but heap data is NOT zeroized.
   */
  private purgeAll(): void {
    // 1. Zeroize all LedgerBlock binary buffers (serializedRequest, hashes).
    this.memoryQueue.clearAll();

    // 2. Reject all structured pending Promises.
    const purgeError = new Error(
      '[SovereignCore] Session purged. All pending transactions rejected.'
    );
    for (const [, record] of this.pendingRequests) {
      record.reject(purgeError);
    }
    this.pendingRequests.clear();

    // 3. Drop all legacy closure references (NOT byte-level zeroized).
    this.executors.clear();
  }
}
