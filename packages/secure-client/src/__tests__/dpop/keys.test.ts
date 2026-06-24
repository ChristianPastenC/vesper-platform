import { generateDPoPKeyPair } from '../../dpop/keys.js';
import { IDPoPCryptoProvider } from '../../dpop/types.js';

describe('DPoP Keys', () => {
  let mockCryptoProvider: unknown;
  beforeAll(() => {
    // Mock crypto.subtle for node environment if needed
    if (typeof crypto === 'undefined') {
      const crypto = require('crypto');
      (globalThis as { crypto?: unknown }).crypto = {
        subtle: crypto.webcrypto.subtle
      };
    }
    mockCryptoProvider = {
      subtle: ((globalThis as { crypto?: unknown }).crypto as { subtle: unknown }).subtle
    };
  });

  it('should generate a valid key pair', async () => {
    const keyPair = await generateDPoPKeyPair(mockCryptoProvider as IDPoPCryptoProvider);
    expect(keyPair).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKeyJwk).toBeDefined();
  });
});
