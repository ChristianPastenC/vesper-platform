import { DPoPSigner } from '../../dpop/signer.js';
import type { IDPoPCryptoProvider } from '../../dpop/types.js';

describe('DPoPSigner', () => {
  let mockCryptoProvider: jest.Mocked<IDPoPCryptoProvider>;

  beforeEach(() => {
    mockCryptoProvider = {
      subtle: {
        generateKey: jest.fn().mockResolvedValue({
          publicKey: {} as CryptoKey,
          privateKey: {} as CryptoKey,
        }),
        exportKey: jest.fn().mockResolvedValue({
          kty: 'EC',
          crv: 'P-256',
          x: 'xxx',
          y: 'yyy'
        }),
        sign: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
      } as never,
      getRandomBytes: jest.fn().mockReturnValue(new Uint8Array(16)),
      sha256: jest.fn().mockResolvedValue(new Uint8Array(32)),
    };
  });

  it('should create signer and generate proof', async () => {
    const signer = await DPoPSigner.create(mockCryptoProvider, { algorithm: 'ES256' });
    expect(signer).toBeDefined();
    expect(signer.getAlgorithm()).toBe('ES256');
    expect(signer.getPublicKeyJwk()).toBeDefined();

    const proof = await signer.generateProof({
      method: 'GET',
      url: 'https://api.test.com/path?query=123#fragment',
      accessToken: 'token123',
      nonce: 'nonce123'
    });

    expect(proof).toBeDefined();
    expect(typeof proof).toBe('string');
    expect(proof.split('.').length).toBe(3); // Header, payload, signature
  });
});
