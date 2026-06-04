import type {
  NetworkStatusResolver,
  SovereignClientCoreConfig,
  SovereignRequestConfig,
  QueuedRequestRecord,
  PendingDPoPContext,
} from '../types.js';
import type { ISovereignCryptoProvider, ISovereignNetworkAdapter, SovereignAdapterRequest } from '../contracts/index.js';
import { SovereignMemoryQueue } from '../ledger/index.js';
import { resolveTrappingConfig, type ResolvedTrappingConfig } from './config.js';
import { shouldFreezeSession } from './error-matrix.js';
import { serializeAdapterRequest, deserializeAdapterRequest, appendHeaderToBinary } from '../binary.js';

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
 * STRUCTURED PATH — executeRequest() [STRICT ZEROIZATION ENFORCED]
 * ────────────────────────────────────────────────────────────────
 * Accepts a SovereignAdapterRequest whose body and headers are already
 * encoded as Uint8Array buffers. Closures are strictly prohibited.
 *
 * When the request must be queued (offline or 503/504):
 *   1. serializeAdapterRequest() packs the full request into one Uint8Array.
 *   2. That buffer is stored in LedgerBlock.serializedRequest.
 *   3. The `pendingRequests` map stores ONLY (resolve, reject, dpop) — zero payload.
 *   4. On TTL expiry / purge: zeroizeBlock() overwrites the buffer with 0x00.
 *      The pending Promise is then rejected — no sensitive bytes remain.
 *   5. On queue drain: deserializeAdapterRequest() reconstructs the request
 *      transiently; DPoP proofs are regenerated freshly; the networkAdapter
 *      executes it; the buffer is then dequeued and zeroized immediately.
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
   * Structured pending-request registry.
   *
   * Stores ONLY resolve/reject callbacks and static DPoP contexts — zero 
   * transactional payload. All sensitive data lives in LedgerBlock.serializedRequest 
   * (Uint8Array) and is byte-level zeroized on expiry or purge.
   */
  private readonly pendingRequests = new Map<string, QueuedRequestRecord<unknown>>();

  private constructor(config: SovereignClientCoreConfig) {
    this.cryptoProvider = config.cryptoProvider;
    this.isOnline       = config.networkResolver;
    this.defaultTTL     = config.defaultTTL ?? 60_000;
    this.memoryQueue    = SovereignMemoryQueue.getInstance();
    this.trapping       = resolveTrappingConfig(config.errorTrapping);
    this.networkAdapter = config.networkAdapter;

    // Start the active memory watchdog to detect tampering in real-time.
    this.memoryQueue.startWatchdog(this.cryptoProvider, () => {
      console.error(
        '[SovereignCore] CRITICAL: Active memory tampering detected by RAM watchdog. ' +
        'Invoking emergency purge.'
      );
      this.purgeAll();
    });
  }

  public static getInstance(config: SovereignClientCoreConfig): SovereignClientCore {
    if (!SovereignClientCore.instance) {
      SovereignClientCore.instance = new SovereignClientCore(config);
    }
    return SovereignClientCore.instance;
  }

  // ── Execution ──────────────────────────────────────────────────────────────

  /**
   * executeRequest — the fully zeroizable execution path.
   *
   * Accepts a structured SovereignAdapterRequest instead of an opaque closure.
   * All sensitive fields (body, encodedHeaders) must be Uint8Array buffers.
   *
   * @param requestId  Stable correlation ID (used as LedgerBlock key).
   * @param request    Fully binary-encoded HTTP request descriptor.
   * @param dpop       Optional context to generate DPoP proofs on the fly.
   * @param config     Per-request TTL override.
   */
  public async executeRequest<T>(
    requestId: string,
    request: SovereignAdapterRequest,
    dpop?: PendingDPoPContext,
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
        let dispatchRequest = request;
        
        if (dpop) {
          const context = await dpop.contextResolver();
          const proofOptions: any = { method: dpop.method, url: dpop.url };
          if (context.accessToken !== undefined) proofOptions.accessToken = context.accessToken;
          if (context.nonce !== undefined) proofOptions.nonce = context.nonce;
          
          const proof = await dpop.signer.generateProof(proofOptions);
          dispatchRequest = {
            ...request,
            encodedHeaders: appendHeaderToBinary(request.encodedHeaders ?? new Uint8Array(0), 'DPoP', proof)
          };
        }

        const response = await this.networkAdapter.request<T>(dispatchRequest);
        
        // Consume and zero
        SovereignClientCore.zeroRequestBuffers(request);
        if (dispatchRequest !== request) SovereignClientCore.zeroRequestBuffers(dispatchRequest);
        
        return response.data;
      } catch (error) {
        if (shouldFreezeSession(error, this.trapping)) {
          return this.enqueueStructuredRequest<T>(requestId, request, dpop, config);
        }
        SovereignClientCore.zeroRequestBuffers(request);
        throw error;
      }
    }

    return this.enqueueStructuredRequest<T>(requestId, request, dpop, config);
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

        // Structured path reconstruction
        if (this.pendingRequests.has(id) && this.networkAdapter) {
          const pending = this.pendingRequests.get(id)!;
          try {
            const deserialized = deserializeAdapterRequest(block.serializedRequest);

            if (!deserialized) {
              pending.reject(new Error(
                `[SovereignCore] Transaction [${id}] binary buffer was zeroized before replay.`
              ));
              this.pendingRequests.delete(id);
              await this.memoryQueue.dequeue(this.cryptoProvider, id);
              continue;
            }

            let dispatchRequest = deserialized;
            if (pending.dpop) {
              const context = await pending.dpop.contextResolver();
              const proofOptions: any = { method: pending.dpop.method, url: pending.dpop.url };
              if (context.accessToken !== undefined) proofOptions.accessToken = context.accessToken;
              if (context.nonce !== undefined) proofOptions.nonce = context.nonce;
              
              const proof = await pending.dpop.signer.generateProof(proofOptions);
              dispatchRequest = {
                ...deserialized,
                encodedHeaders: appendHeaderToBinary(deserialized.encodedHeaders ?? new Uint8Array(0), 'DPoP', proof)
              };
            }

            const response = await this.networkAdapter.request<unknown>(dispatchRequest);

            // Dequeue immediately: zeroizeBlock() runs here, wiping serializedRequest.
            await this.memoryQueue.dequeue(this.cryptoProvider, id);
            this.pendingRequests.delete(id);

            pending.resolve(response.data);
            
            SovereignClientCore.zeroRequestBuffers(deserialized);
            if (dispatchRequest !== deserialized) SovereignClientCore.zeroRequestBuffers(dispatchRequest);
          } catch (err) {
            pending.reject(err);
            break;
          }
          continue;
        } else {
          // If a request exists in the ledger without a pending promise handle 
          // (or missing adapter), it's a leak or state corruption. Purge it.
          await this.memoryQueue.dequeue(this.cryptoProvider, id);
          this.pendingRequests.delete(id);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private enqueueStructuredRequest<T>(
    id: string,
    request: SovereignAdapterRequest,
    dpop?: PendingDPoPContext,
    config?: SovereignRequestConfig,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ttl = config?.ttl ?? this.defaultTTL;

      const binaryRequest = serializeAdapterRequest(request);

      SovereignClientCore.zeroRequestBuffers(request);

      const onExpiry = (expiredId: string): void => {
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
          // Promise handles + static dpop config, ZERO closures containing payload data.
          this.pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject, ...(dpop && { dpop }) });
        })
        .catch(reject);
    });
  }

  /**
   * Purges all in-flight state unconditionally.
   * LedgerBlock buffers are byte-level zeroized by `.fill(0)`.
   */
  private purgeAll(): void {
    // 1. Zeroize all LedgerBlock binary buffers.
    this.memoryQueue.clearAll();

    // 2. Reject all pending Promises.
    const purgeError = new Error(
      '[SovereignCore] Session purged. All pending transactions rejected.'
    );
    for (const [, record] of this.pendingRequests) {
      record.reject(purgeError);
    }
    this.pendingRequests.clear();
  }

  /**
   * Zeroes the binary payload buffers of a SovereignAdapterRequest in-place.
   */
  private static zeroRequestBuffers(request: Pick<SovereignAdapterRequest, 'body' | 'encodedHeaders'>): void {
    if (request.body !== undefined && request.body !== null && request.body.length > 0) {
      request.body.fill(0);
    }
    if (request.encodedHeaders !== undefined && request.encodedHeaders.length > 0) {
      request.encodedHeaders.fill(0);
    }
  }
}
