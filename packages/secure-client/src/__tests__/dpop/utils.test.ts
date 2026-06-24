import { base64UrlEncode, base64UrlEncodeJson, normalizeHtu, buildSigningParams } from '../../dpop/utils.js';

describe('DPoP Utils', () => {
  it('should base64url encode bytes', () => {
    const bytes = new Uint8Array([1, 2, 3, 255]);
    const encoded = base64UrlEncode(bytes);
    expect(encoded).toBe('AQID_w');
  });

  it('should base64url encode json', () => {
    const obj = { typ: 'dpop+jwt', alg: 'ES256' };
    const encoded = base64UrlEncodeJson(obj);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('should normalize htu', () => {
    const url1 = 'https://api.test.com/path?query=1#frag';
    expect(normalizeHtu(url1)).toBe('https://api.test.com/path');

    // Testing fallback behavior if URL is not available
    const url2 = 'http://test.com/path';
    expect(normalizeHtu(url2)).toBe('http://test.com/path');
  });

  it('should build signing params', () => {
    expect(buildSigningParams('ES256')).toEqual({ name: 'ECDSA', hash: 'SHA-256' });
    expect(buildSigningParams('PS256')).toEqual({ name: 'RSA-PSS', saltLength: 32 });
  });
});
