import type {
  ErrorTrappingConfig,
  ISovereignCryptoProvider,
  NetworkStatusResolver,
  SovereignClientCoreConfig,
  SovereignRequestConfig,
} from './types.js';
import { SovereignHttpError } from './types.js';
import { SovereignMemoryQueue } from './ledger.js';

// ---------------------------------------------------------------------------
// Internal resolved config shape (all fields guaranteed after normalisation)
// ---------------------------------------------------------------------------

/**
 * Normalised, fully-resolved version of ErrorTrappingConfig.
 * All optional fields are collapsed to their defaults so the matrix evaluation
 * code never needs to perform undefined checks at call time.
 */
interface ResolvedTrappingConfig {
  freezeOn503_504: boolean;
  freezeOn401: boolean;
  additionalFreezableStatuses: ReadonlySet<number>;
}

// HTTP status code constants — avoids magic numbers inside the matrix.
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;

// ---------------------------------------------------------------------------
// SovereignClientCore — Singleton
// ---------------------------------------------------------------------------

/**
 * SovereignClientCore
 *
 * The global-singleton orchestrator of the SovereignCore framework.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SINGLETON CONTRACT
 * ═══════════════════════════════════════════════════════════════════════
 * Only one instance of SovereignClientCore exists per JS runtime.
 * Call SovereignClientCore.getInstance(config) to obtain it.
 *
 * First call:   creates the instance with the supplied config.
 * Subsequent:   ignores the config argument and returns the existing instance.
 *
 * This mirrors SovereignMemoryQueue's singleton and ensures there is exactly
 * one executor map, one queue reference, and one error-trapping config active
 * in the application at any time — preventing state fragmentation across
 * multiple construction sites.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * TYPED-ARRAY / BIT-LEVEL ZEROIZATION MODEL
 * ═══════════════════════════════════════════════════════════════════════
 * Request metadata is serialized into a Uint8Array (via TextEncoder) and
 * passed directly to SovereignMemoryQueue.enqueue(). The ledger holds the
 * SAME buffer reference — no copy is made. When the ledger zeroizes a block
 * it calls Uint8Array.fill(0) on that buffer, erasing the bytes regardless
 * of how many references point to it.
 *
 * After enqueue(), the local `serializedData` reference in enqueueForRetry()
 * is dropped. The JSON string produced by JSON.stringify() is an ephemeral
 * JS engine allocation and cannot be directly zeroed — however, it contains
 * only metadata (never private keys or tokens per API contract), and the
 * engine may GC it at any time after TextEncoder.encode() completes.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ERROR TRAPPING MATRIX
 * ═══════════════════════════════════════════════════════════════════════
 * After every executor failure the interceptor runs a two-stage evaluation:
 *
 *  Stage 1 — Transport-layer errors (no HTTP response received):
 *    • Axios: isAxiosError && !response       → always freeze
 *    • fetch / RN: TypeError 'Network request failed' → always freeze
 *    • Apollo / GQL: error.networkError truthy → always freeze
 *
 *  Stage 2 — HTTP status code errors (server responded with error code):
 *    • 503 Service Unavailable / 504 Gateway Timeout → freeze (default ON)
 *    • 401 Unauthorized   → freeze (default OFF — opt-in for IdP outage)
 *    • additionalFreezableStatuses members → freeze (always)
 *
 *  Errors that don't match either stage are re-thrown immediately.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * LIFECYCLE
 * ═══════════════════════════════════════════════════════════════════════
 *  1. Consumer calls SovereignClientCore.getInstance(config) once at app boot.
 *  2. Consumer calls execute() for every outbound request.
 *  3. If the network resolver reports the channel as healthy and no queue
 *     drain is in progress, the executor fires immediately.
 *  4. On a trappable failure, the request metadata is serialised into a
 *     Uint8Array and enqueued inside the volatile RAM ledger. The returned
 *     Promise stays pending.
 *  5. When connectivity is restored, the consumer calls
 *     processSynchronizedQueue(), which runs the handshake challenge,
 *     validates ledger integrity, and drains queued executors in FIFO order.
 */
export class SovereignClientCore {
  // ── Singleton state ────────────────────────────────────────────────────────
  private static instance: SovereignClientCore;

  // ── Per-instance state ─────────────────────────────────────────────────────
  private readonly memoryQueue: SovereignMemoryQueue;
  private readonly cryptoProvider: ISovereignCryptoProvider;
  private readonly isOnline: NetworkStatusResolver;
  private readonly defaultTTL: number;
  private readonly trapping: ResolvedTrappingConfig;

  /** Guards against concurrent queue drain attempts. */
  private isProcessingQueue = false;

  /**
   * Map of queued executor functions keyed by request ID.
   * Each executor closes over the original Promise resolve/reject pair so
   * that the caller's await is fulfilled as soon as the queue drains.
   */
  private readonly executors = new Map<string, () => Promise<unknown>>();

  /** Private constructor — use SovereignClientCore.getInstance(). */
  private constructor(config: SovereignClientCoreConfig) {
    this.cryptoProvider = config.cryptoProvider;
    this.isOnline = config.networkResolver;
    this.defaultTTL = config.defaultTTL ?? 60_000;
    this.memoryQueue = SovereignMemoryQueue.getInstance();
    this.trapping = this.resolveTrappingConfig(config.errorTrapping);
  }

  // ---------------------------------------------------------------------------
  // Singleton accessor
  // ---------------------------------------------------------------------------

  /**
   * Returns the process-wide singleton instance.
   *
   * First call:   creates the instance with the supplied config.
   * Subsequent:   returns the existing instance (config argument is ignored).
   *
   * @param config  Construction config — only used on the very first call.
   */
  public static getInstance(config: SovereignClientCoreConfig): SovereignClientCore {
    if (!SovereignClientCore.instance) {
      SovereignClientCore.instance = new SovereignClientCore(config);
    }
    return SovereignClientCore.instance;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Executes a request immediately when online, or enqueues it in the
   * cryptographic ledger when the channel is unavailable or returns a
   * trappable HTTP status code.
   *
   * The request metadata is serialized into a Uint8Array (typed array) and
   * stored inside the ledger. The ledger byte-level zeroizes this buffer
   * (.fill(0)) on TTL expiry, dequeue, or emergency purge.
   *
   * @param requestId  Stable identifier for this logical request. Must be
   *                   unique within the lifetime of a queue session.
   * @param executor   Zero-argument async function that performs the actual
   *                   network call. Transport details stay with the caller —
   *                   this can wrap fetch, Axios, GraphQL, gRPC-Web, etc.
   * @param metaData   Serializable metadata snapshot of the request.
   *                   Stored in RAM for audit and TTL tracking.
   *                   MUST NOT contain private keys, tokens, or raw secrets.
   * @param config     Optional per-request TTL override.
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
        if (this.shouldFreezeSession(error)) {
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
   *     the backend before this resolves to true.
   *  3. Verifies the ledger's cryptographic integrity (chain linkage + payload
   *     content hashes); purges all RAM and throws if tampering is detected.
   *  4. Executes each queued request in FIFO order, dequeuing and zeroizing
   *     blocks as they succeed. Halts at the first executor failure to preserve
   *     ordering guarantees.
   *
   * @param handshakeValidator  Consumer-supplied async function that performs
   *                            the out-of-band cryptographic channel legitimacy
   *                            challenge with the backend.
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

      // Step 3: FIFO drain — snapshot the execution order before mutation.
      const executionOrder = this.memoryQueue.getExecutionOrder();

      for (const id of executionOrder) {
        if (!this.memoryQueue.getPayload(id)) continue;

        try {
          const trigger = this.executors.get(id);
          if (trigger) await trigger();

          // dequeue() zeroizes all Uint8Array fields on the block.
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
  // Private — Error Trapping Matrix
  // ---------------------------------------------------------------------------

  /**
   * Central decision function: should this error cause the session to freeze
   * (RAM sequestration) or be re-thrown to the caller immediately?
   *
   * Evaluates two sequential stages:
   *  1. Transport-layer detection  — no HTTP response received.
   *  2. HTTP status code matrix    — server responded with a freezable code.
   */
  private shouldFreezeSession(error: unknown): boolean {
    return this.isTransportError(error) || this.isFreezableHttpStatus(error);
  }

  /**
   * Stage 1 — Transport-layer error detection.
   *
   * Recognises errors that carry no HTTP response at all, meaning the request
   * never reached the server (or the response was never received):
   *
   *  • Axios:           isAxiosError === true  AND  response is absent/null
   *  • fetch / RN:      TypeError with message 'Network request failed'
   *  • Apollo / GQL:    error.networkError is truthy (wraps the original cause)
   *  • SovereignHttpError with status 0 (signals a pre-response abort)
   */
  private isTransportError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as Record<string, unknown>;

    // Axios: response property is absent when no response was received.
    if (e['isAxiosError'] === true && !e['response']) return true;

    // fetch / React Native: TypeError is thrown on network unavailability.
    if (error instanceof TypeError && error.message === 'Network request failed') return true;

    // Apollo GraphQL client wraps transport failures under networkError.
    if (e['networkError']) return true;

    return false;
  }

  /**
   * Stage 2 — HTTP status code matrix evaluation.
   *
   * Attempts to extract a concrete HTTP status integer from the error using
   * extractHttpStatus(), then evaluates it against the resolved trapping config.
   *
   * Freeze decision table (evaluated in order):
   *  ┌──────────────────────────────────────┬──────────────────────────────┐
   *  │ Status                               │ Freeze condition             │
   *  ├──────────────────────────────────────┼──────────────────────────────┤
   *  │ 503 Service Unavailable              │ trapping.freezeOn503_504     │
   *  │ 504 Gateway Timeout                  │ trapping.freezeOn503_504     │
   *  │ 401 Unauthorized                     │ trapping.freezeOn401         │
   *  │ additionalFreezableStatuses member   │ always freeze                │
   *  │ anything else                        │ do NOT freeze (propagate)    │
   *  └──────────────────────────────────────┴──────────────────────────────┘
   */
  private isFreezableHttpStatus(error: unknown): boolean {
    const status = this.extractHttpStatus(error);
    if (status === null) return false;

    if (
      (status === HTTP_SERVICE_UNAVAILABLE || status === HTTP_GATEWAY_TIMEOUT) &&
      this.trapping.freezeOn503_504
    ) {
      return true;
    }

    if (status === HTTP_UNAUTHORIZED && this.trapping.freezeOn401) {
      return true;
    }

    if (this.trapping.additionalFreezableStatuses.has(status)) {
      return true;
    }

    return false;
  }

  /**
   * Extracts a numeric HTTP status code from an error object by probing the
   * shapes emitted by the supported transport adapters:
   *
   *  • SovereignHttpError     → error.status
   *  • Axios AxiosError       → error.response.status
   *  • fetch-shaped wrapper   → error.status (some wrappers expose this)
   *  • Apollo / GQL           → error.networkError.statusCode
   *
   * Returns null when no status code can be reliably extracted.
   */
  private extractHttpStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;
    const e = error as Record<string, unknown>;

    // SovereignHttpError: first-class typed error from this library.
    if (error instanceof SovereignHttpError) return error.status;

    // Axios AxiosError: status lives inside the response envelope.
    if (e['isAxiosError'] === true) {
      const response = e['response'] as Record<string, unknown> | undefined;
      if (response && typeof response['status'] === 'number') {
        return response['status'];
      }
    }

    // fetch Response-shaped wrapper: some libraries re-throw with .status.
    if (typeof e['status'] === 'number') return e['status'];

    // Apollo GraphQL: networkError carries statusCode for HTTP failures.
    const networkErr = e['networkError'] as Record<string, unknown> | undefined;
    if (networkErr && typeof networkErr['statusCode'] === 'number') {
      return networkErr['statusCode'];
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Private — Queue helpers
  // ---------------------------------------------------------------------------

  /**
   * Serialises the request metadata into a Uint8Array and parks the executor
   * inside the cryptographic ledger.
   *
   * Typed-array pipeline:
   *  1. JSON.stringify(metaData)              → ephemeral JS string
   *  2. TextEncoder.encode(jsonString)        → Uint8Array (serializedData)
   *  3. memoryQueue.enqueue(serializedData)   → ledger holds the buffer ref
   *
   * When the ledger evicts the block (TTL expiry / dequeue / purge) it calls
   * serializedData.fill(0), zeroing the bytes in-place regardless of any
   * other references. The local `serializedData` variable is unreachable after
   * the .then() callback so no aliasing risk exists.
   *
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

      // Serialize metadata into a Uint8Array (typed array).
      // The ledger holds this buffer and zeroizes it on eviction.
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
   * Clears both the in-memory ledger (zeroizing all block Uint8Arrays) and
   * the executor map. Called when handshake validation or ledger integrity
   * checks fail.
   */
  private purgeAll(): void {
    this.memoryQueue.clearAll(); // internally zeroizes all Uint8Array fields
    this.executors.clear();
  }

  // ---------------------------------------------------------------------------
  // Private — Config helpers
  // ---------------------------------------------------------------------------

  /**
   * Normalises the consumer-supplied ErrorTrappingConfig by applying defaults
   * for every optional field, producing a ResolvedTrappingConfig where all
   * values are fully defined and ready for use inside hot evaluation paths.
   */
  private resolveTrappingConfig(
    raw: ErrorTrappingConfig | undefined
  ): ResolvedTrappingConfig {
    return {
      freezeOn503_504: raw?.freezeOn503_504 ?? true,
      freezeOn401: raw?.freezeOn401 ?? false,
      additionalFreezableStatuses: new Set(raw?.additionalFreezableStatuses ?? []),
    };
  }
}
