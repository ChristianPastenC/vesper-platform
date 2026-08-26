import { sha256Sync } from '../../ledger/crypto.js';

describe('sha256Sync', () => {
  it('should calculate hash of data', () => {
    const data = new Uint8Array([1, 2, 3]);
    const hash = sha256Sync(data);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(32); // SHA-256 is 32 bytes
  });

  it('should match expected sha256 hash for empty array', () => {
    const data = new Uint8Array(0);
    const hash = sha256Sync(data);
    // E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855
    const expectedHash = new Uint8Array([
      0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14,
      0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9, 0x24,
      0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c,
      0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52, 0xb8, 0x55
    ]);
    expect(hash).toEqual(expectedHash);
  });
});
