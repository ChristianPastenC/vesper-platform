import type {
  ISovereignCryptoProvider,
  NetworkStatusResolver,
  SovereignClientCoreConfig,
  SovereignRequestConfig,
} from './types.js';
import { SovereignMemoryQueue } from './ledger.js';

/**
 * SovereignClientCore
 *
 * The primary consumer-facing orchestrator of the SovereignCore framework.
 *
 * Responsibility: intercept outbound requests and decide whether to execute
 * them immediately over a live channel or divert them into the in-memory
 * cryptographic ledger (SovereignMemoryQueue) when connectivity is degraded.
 *
 * Design contract (framework and transport agnostic):
 *  - Works with any JS framework: React, React Native, Angular, Vue, etc.
 *  - Works with any HTTP transport: fetch, Axios, Apollo/GraphQL, gRPC-Web,
 *    WebSockets, or any other async function returning a Promise.
 *  - The only coupling point is the executor callback — a zero-argument
 *    function that returns Promise<T>. The caller owns the transport layer.
 *
 * Lifecycle:
 *  1. Consumer calls execute() for every outbound request.
 *  2. If the network resolver reports the channel as healthy and no queue
 *     drain is in progress, the executor fires immediately.
 *  3. On network failure, the request metadata is serialised and enqueued
 *     inside volatile RAM. The returned Promise stays pending.
 *  4. When connectivity is restored the consumer calls
 *     processSynchronizedQueue(), which runs the handshake challenge and
 *     validates ledger integrity before draining queued executors in order.
 */
export class SovereignClientCore {
  private readonly memoryQueue: SovereignMemoryQueue;
  private readonly cryptoProvider: ISovereignCryptoProvider;
  private readonly isOnline: NetworkStatusResolver;
  private readonly defaultTTL: number;

  /** Guards against concurrent queue drain attempts. */
  private isProcessingQueue = false;

  /**
   * Map of queued executor functions keyed by their request ID.
   * Each executor closes over the original Promise resolve/reject pair so
   * that the caller's await is fulfilled as soon as the queue drains.
   */
  private readonly executors = new Map<string, () => Promise<unknown>>();

  constructor(config: SovereignClientCoreConfig) {
    this.cryptoProvider = config.cryptoProvider;
    this.isOnline = config.networkResolver;
    this.defaultTTL = config.defaultTTL ?? 60_000;
    this.memoryQueue = SovereignMemoryQueue.getInstance();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Executes a request immediately when online, or enqueues it in the
   * cryptographic ledger when the channel is unavailable.
   *
   * @param requestId   Stable identifier for this logical request. Must be
   *                    unique within the lifetime of a queue session.
   * @param executor    Zero-argument async function that performs the actual
   *                    network call. Ownership of transport details stays with
   *                    the caller — this can wrap fetch, Axios, GraphQL, etc.
   * @param metaData    Serializable metadata snapshot of the request.
   *                    Stored (encrypted in RAM) for audit and TTL tracking.
   *                    Must not contain secrets in plain form.
   * @param config      Optional per-request TTL override.
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
        // Re-divert to RAM only for network-layer failures.
        // Application-level errors (4xx, validation, etc.) propagate normally.
        if (this.isNetworkError(error)) {
          return this.enqueueForRetry(requestId, executor, metaData, config);
        }
        throw error;
      }
    }

    return this.enqueueForRetry(requestId, executor, metaData, config);
  }

  /**
   * Drains the in-memory ledger after network restoration.
   *
   * Sequence:
   *  1. Prevents re-entrant calls via isProcessingQueue guard.
   *  2. Runs the caller-supplied handshake validator — the consumer is
   *     responsible for performing the cryptographic challenge-response with
   *     the backend server before this resolves to true.
   *  3. Verifies the ledger's cryptographic integrity; purges RAM and throws
   *     if tampering or corruption is detected.
   *  4. Executes each queued request in FIFO order, dequeuing blocks as they
   *     succeed. Stops at the first execution error to preserve ordering
   *     guarantees (the caller decides whether to retry or abort).
   *
   * @param handshakeValidator  Async function supplied by the consumer that
   *                            performs the out-of-band cryptographic channel
   *                            legitimacy challenge with the backend.
   */
  public async processSynchronizedQueue(
    handshakeValidator: () => Promise<boolean>
  ): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      // Step 1: channel authentication.
      const isChannelValid = await handshakeValidator();
      if (!isChannelValid) {
        this.purgeAll();
        throw new Error('[SovereignCore] Handshake failed. Hostile network. RAM purged.');
      }

      // Step 2: ledger integrity gate.
      const isLedgerIntact = await this.memoryQueue.verifyLedgerIntegrity(
        this.cryptoProvider
      );
      if (!isLedgerIntact) {
        this.purgeAll();
        throw new Error('[SovereignCore] Ledger integrity compromised. RAM purged.');
      }

      // Step 3: FIFO drain — snapshot the order before mutation.
      const executionOrder = this.memoryQueue.getExecutionOrder();

      for (const id of executionOrder) {
        if (!this.memoryQueue.getPayload(id)) continue;

        try {
          const trigger = this.executors.get(id);
          if (trigger) await trigger();

          await this.memoryQueue.dequeue(this.cryptoProvider, id);
          this.executors.delete(id);
        } catch {
          // Halt on first executor failure — preserves FIFO ordering contract.
          break;
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Serialises the request metadata and parks the executor inside the ledger.
   * The returned Promise stays pending until processSynchronizedQueue() drains
   * it, or until the TTL expires (at which point the Promise rejects).
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
          // Wrap the executor so we can resolve/reject the outer Promise.
          this.executors.set(id, async () => {
            const result = await executor();
            resolve(result);
          });
        })
        .catch(reject);
    });
  }

  /**
   * Clears both the in-memory ledger and the executor map.
   * Called when handshake validation or ledger integrity checks fail.
   */
  private purgeAll(): void {
    this.memoryQueue.clearAll();
    this.executors.clear();
  }

  /**
   * Heuristic to distinguish transport-layer failures from application errors.
   *
   * Covers the three most common network error signatures across the
   * supported transport adapters:
   *  - Axios: error.isAxiosError && !error.response (no response received)
   *  - fetch / React Native fetch: TypeError with 'Network request failed'
   *  - Apollo / generic GraphQL clients: error.networkError truthy
   */
  private isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as Record<string, unknown>;
    if (e['isAxiosError'] && !e['response']) return true;
    if (error instanceof TypeError && error.message === 'Network request failed') return true;
    if (e['networkError']) return true;
    return false;
  }
}
