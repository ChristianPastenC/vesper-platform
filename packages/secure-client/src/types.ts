// ISovereignCryptoProvider and ISovereignNetworkAdapter are defined in contracts.ts
// (zero-dependency layer) and re-exported here for backward compatibility.
export type { ISovereignCryptoProvider } from './contracts/index.js';
import type { ISovereignCryptoProvider } from './contracts/index.js';
import type { ISovereignNetworkAdapter } from './contracts/index.js';
import type { DPoPSigner } from './dpop/signer.js';
import type { DPoPContextResolver } from './dpop/index.js';



/**
 * Per-request configuration overrides passed to SovereignClientCore.execute().
 */
export interface SovereignRequestConfig {
  /**
   * Time-to-live in milliseconds for this request while sequestered in RAM.
   * If the channel is not restored before this deadline, the payload is
   * byte-level zeroized and the pending Promise is rejected.
   *
   * Falls back to the defaultTTL set on SovereignClientCore when omitted.
   */
  ttl?: number;
}

/**
 * Typed HTTP error thrown — or detectable — when an executor receives a
 * non-2xx response.  Throw this from your transport adapter to give
 * SovereignClientCore precise visibility into the HTTP status code so the
 * Error Trapping Matrix can decide whether to freeze or propagate.
 *
 * Works alongside Axios / fetch response errors: the library also inspects
 * `error.response.status` (Axios) and `error.status` (fetch Response-shaped
 * errors) automatically — throwing SovereignHttpError is optional but
 * recommended for maximum clarity.
 */
export class SovereignHttpError extends Error {
  public readonly status: number;

  constructor(status: number, message = `HTTP ${status}`) {
    super(message);
    this.name = 'SovereignHttpError';
    this.status = status;
    // Maintain proper prototype chain in ES5 transpilation targets.
    Object.setPrototypeOf(this, SovereignHttpError.prototype);
  }
}

/**
 * Fine-grained control over which HTTP status codes cause SovereignClientCore
 * to freeze the session (enqueue in RAM) instead of immediately propagating
 * the error to the caller.
 *
 * All flags are evaluated inside the Error Trapping Matrix after every failed
 * executor call, complementing the baseline transport-layer error detection.
 */
export interface ErrorTrappingConfig {
  /**
   * Freeze the session when the server responds with 503 Service Unavailable
   * or 504 Gateway Timeout.
   *
   * These codes signal transient server-side unavailability (overloaded
   * upstream, downed reverse-proxy, cloud region degradation) and are the
   * canonical use-case for SovereignCore's RAM sequestration model.
   *
   * @default true
   */
  freezeOn503_504?: boolean;

  /**
   * Freeze the session when the server responds with 401 Unauthorized.
   *
   * Enable ONLY in deployments where 401 responses are expected to be caused
   * by an IdP infrastructure outage — i.e. the backend cannot verify the
   * bearer token because its auth service is unreachable — not by genuinely
   * invalid or expired credentials.
   *
   * Risk: enabling this in environments where 401 means bad credentials will
   * silently queue requests that will keep returning 401 on retry, burning TTL
   * budget until zeroization fires.  Pair with short TTLs and monitoring when
   * enabling in production.
   *
   * @default false
   */
  freezeOn401?: boolean;

  /**
   * Additional HTTP status codes beyond the built-in matrix that should
   * trigger RAM sequestration.  Useful for custom upstream error contracts,
   * e.g. 429 Too Many Requests with a Retry-After header, or proprietary
   * gateway codes used by internal platform infrastructure.
   *
   * @default []
   */
  additionalFreezableStatuses?: number[];
}

/**
 * Constructor configuration bag for SovereignClientCore.
 */
export interface SovereignClientCoreConfig {
  /** Cryptographic primitive provider injected by the consumer application. */
  cryptoProvider: ISovereignCryptoProvider;

  /**
   * Async function that resolves to true when a valid network channel is
   * available, false otherwise. The library calls this before every execute()
   * to decide whether to attempt a live request or enter RAM sequestration.
   */
  networkResolver: NetworkStatusResolver;

  /**
   * Default TTL (ms) applied to every queued request that does not supply its
   * own ttl override via SovereignRequestConfig. Defaults to 60 000 ms.
   */
  defaultTTL?: number;

  /**
   * HTTP Error Trapping Matrix configuration.
   * Controls which server-side status codes activate session freezing in
   * addition to the baseline transport-layer (no-response) detection.
   *
   * When omitted, only transport-layer failures and HTTP 503/504 trigger
   * sequestration (safe defaults for most production deployments).
   */
  errorTrapping?: ErrorTrappingConfig;

  /**
   * Transport adapter used by `executeRequest()` to dispatch queued HTTP calls.
   *
   * Required when using the structured `executeRequest()` path.
   * When provided, the core serializes the entire `SovereignAdapterRequest`
   * (including body and headers) into the `LedgerBlock.serializedRequest`
   * `Uint8Array`, replacing the closure-based `executors` map.  On TTL expiry
   * or session purge, `zeroizeBlock()` overwrites every sensitive byte via
   * `.fill(0)` — no plain-text data lingers in any JS closure or heap object.
   */
  networkAdapter?: ISovereignNetworkAdapter;
}


/**
 * A single cryptographic block inside the in-memory transaction ledger.
 *
 * Each block is chained to its predecessor via previousHash, forming an
 * immutable linked structure that allows runtime tamper detection without
 * any disk persistence.
 */
export interface LedgerBlock {
  /** Unique correlation identifier for this transaction. */
  id: string;

  /**
   * Binary-serialized representation of the request metadata.
   * Written with zeroes (.fill(0)) immediately upon TTL expiry or
   * explicit zeroization — never persisted to disk.
   */
  serializedRequest: Uint8Array;

  /** Unix epoch ms at the moment this block was enqueued. */
  timestamp: number;

  /** Effective TTL (ms) at enqueue time. */
  ttl: number;

  /**
   * Handle returned by setTimeout for the TTL watchdog.
   * Kept opaque (any) to remain portable across JS environments that expose
   * different timer handle types (number in browsers, NodeJS.Timeout in Node).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expiryTimer: any;

  /**
   * SHA-256 hash of the preceding block.
   * Set to a 32-byte zero vector for the genesis (first) block.
   */
  previousHash: Uint8Array;

  /**
   * SHA-256 hash of this block's content:
   *   SHA256(serializedRequest || previousHash || timestamp)
   */
  currentHash: Uint8Array;

  /**
   * True once activeZeroization() has been called on this block.
   * After zeroization the serializedRequest bytes are all zero and the
   * original hash is no longer recomputable from the payload.
   */
  isZeroized: boolean;
}

/**
 * Async predicate injected by the consumer to resolve current network reachability.
 * Must resolve quickly; heavy I/O inside this function will stall the execute() path.
 */
export type NetworkStatusResolver = () => Promise<boolean>;

/**
 * Internal record stored in the `pendingRequests` map for each call enqueued
 * via `executeRequest()`.
 *
 * ── Security Invariant ────────────────────────────────────────────────────────
 * This record stores ONLY the Promise resolve/reject callbacks.
 * It does NOT capture the request body, headers, URL, or any transactional
 * payload — those live exclusively inside the `LedgerBlock.serializedRequest`
 * Uint8Array, which is byte-level zeroized (`.fill(0)`) on TTL expiry or purge.
 *
 * This is the structural replacement for the legacy `executors` Map whose
 * closure-based entries captured sensitive data as plain JS strings in the heap.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface QueuedRequestRecord<T = unknown> {
  /** Resolves the pending Promise when the queued request succeeds on replay. */
  resolve: (value: T) => void;
  /** Rejects the pending Promise on TTL expiry, purge, or replay failure. */
  reject:  (reason: unknown) => void;
  /** 
   * Context to regenerate a fresh DPoP proof when draining the queue,
   * without capturing transactional data in a closure.
   */
  dpop?: PendingDPoPContext;
}

/**
 * Static context required to generate a DPoP proof.
 * Does NOT contain sensitive payloads.
 */
export interface PendingDPoPContext {
  signer: DPoPSigner;
  contextResolver: DPoPContextResolver;
  method: string;
  url: string;
}
