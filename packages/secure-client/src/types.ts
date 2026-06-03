/**
 * Platform-agnostic cryptographic primitive provider.
 *
 * Consumers must supply a concrete implementation suited to their runtime
 * environment (e.g. Web Crypto API for browsers, expo-crypto for React Native,
 * Node.js crypto module for server-side usage).
 */
export interface ISovereignCryptoProvider {
  /**
   * Returns a cryptographically secure random byte sequence of the requested length.
   * Must NOT use Math.random() or any other non-CSPRNG source.
   */
  getRandomBytes(byteLength: number): Uint8Array;

  /**
   * Computes a SHA-256 digest over the supplied binary data.
   * The returned Uint8Array MUST be 32 bytes long.
   */
  sha256(data: Uint8Array): Promise<Uint8Array>;
}

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
   *   SHA256(id || serializedRequest || timestamp || ttl || previousHash)
   */
  hash: Uint8Array;

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
