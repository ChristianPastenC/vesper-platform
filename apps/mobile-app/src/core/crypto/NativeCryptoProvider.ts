import * as Crypto from 'expo-crypto';
import type { IDPoPCryptoProvider } from '@sovereign/secure-client';

/**
 * NativeCryptoProvider
 *
 * Provides cryptographic primitives using expo-crypto, ensuring compatibility
 * with the Hermes engine without relying on the global window.crypto object.
 * Implements IDPoPCryptoProvider which extends ISovereignCryptoProvider.
 */
export class NativeCryptoProvider implements IDPoPCryptoProvider {
  // Expose the SubtleCrypto implementation from expo-crypto
  public readonly subtle: SubtleCrypto = Crypto.subtle;

  /**
   * Returns a freshly allocated Uint8Array of cryptographically random bytes.
   */
  public getRandomBytes(byteLength: number): Uint8Array {
    return Crypto.getRandomBytes(byteLength);
  }

  /**
   * Computes the SHA-256 digest of the supplied data.
   * Returns exactly 32 bytes.
   */
  public async sha256(data: Uint8Array): Promise<Uint8Array> {
    // Utilize the standard Web Crypto API exposed by expo-crypto
    const hashBuffer = await this.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }
}

// Export a singleton instance if desired, or let consumers instantiate it
export const nativeCryptoProvider = new NativeCryptoProvider();
