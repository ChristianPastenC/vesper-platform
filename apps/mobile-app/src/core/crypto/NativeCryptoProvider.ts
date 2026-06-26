import { subtle, randomBytes } from 'react-native-quick-crypto';
import type { IDPoPCryptoProvider } from '@sovereign/secure-client';

/**
 * NativeCryptoProvider
 *
 * Provides cryptographic primitives using react-native-quick-crypto, ensuring compatibility
 * with JSI and WebCrypto APIs in React Native Bare workflow.
 * Implements IDPoPCryptoProvider which extends ISovereignCryptoProvider.
 */
export class NativeCryptoProvider implements IDPoPCryptoProvider {
  // Expose the SubtleCrypto implementation from react-native-quick-crypto
  public readonly subtle: SubtleCrypto = subtle as SubtleCrypto;

  /**
   * Returns a freshly allocated Uint8Array of cryptographically random bytes.
   */
  public getRandomBytes(byteLength: number): Uint8Array {
    return new Uint8Array(randomBytes(byteLength));
  }

  /**
   * Computes the SHA-256 digest of the supplied data.
   * Returns exactly 32 bytes.
   */
  public async sha256(data: Uint8Array): Promise<Uint8Array> {
    // Use data.buffer as ArrayBuffer for full compatibility
    const hashBuffer = await this.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
    return new Uint8Array(hashBuffer);
  }
}

// Export a singleton instance if desired, or let consumers instantiate it
export const nativeCryptoProvider = new NativeCryptoProvider();
