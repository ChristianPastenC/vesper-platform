/**
 * @vesper-core/ghost-ledger — cryptographic provider interfaces
 *
 * Platform-agnostic interfaces for cryptographic primitives consumed by
 * SovereignMemoryQueue and SovereignClientCore.
 */

/**
 * ISovereignCryptoProvider
 *
 * Platform-agnostic interface for the cryptographic primitives consumed by
 * SovereignMemoryQueue and SovereignClientCore.
 *
 * @example Browser
 * ```ts
 * const cryptoProvider: ISovereignCryptoProvider = {
 *   getRandomBytes: (n) => window.crypto.getRandomValues(new Uint8Array(n)),
 *   sha256: async (data) => {
 *     const buf = await window.crypto.subtle.digest('SHA-256', data);
 *     return new Uint8Array(buf);
 *   },
 * };
 * ```
 */
export interface ISovereignCryptoProvider {
  /**
   * Returns a freshly allocated Uint8Array of `byteLength` cryptographically
   * random bytes. MUST use a platform CSPRNG.
   */
  getRandomBytes(byteLength: number): Uint8Array;

  /**
   * Computes the SHA-256 digest of the supplied data.
   * MUST return exactly 32 bytes (256 bits).
   */
  sha256(data: Uint8Array): Promise<Uint8Array>;
}

/**
 * IDPoPCryptoProvider
 *
 * Extension of ISovereignCryptoProvider that adds SubtleCrypto access for
 * the asymmetric operations required by the DPoP subsystem.
 *
 * @example Browser
 * ```ts
 * const dpopProvider: IDPoPCryptoProvider = {
 *   subtle: window.crypto.subtle,
 *   getRandomBytes: (n) => window.crypto.getRandomValues(new Uint8Array(n)),
 *   sha256: async (data) => new Uint8Array(
 *     await window.crypto.subtle.digest('SHA-256', data)
 *   ),
 * };
 * ```
 */
export interface IDPoPCryptoProvider extends ISovereignCryptoProvider {
  /**
   * A SubtleCrypto-conformant interface used exclusively for:
   *  - generateKey()
   *  - exportKey()
   *  - sign()
   */
  readonly subtle: SubtleCrypto;
}
