import type { DPoPAlgorithm } from './types.js';

/**
 * Encodes a raw byte array as a base64url string (RFC 4648 §5, no padding).
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = bytes[i + 1] as number ?? 0;
    const b2 = bytes[i + 2] as number ?? 0;

    result += CHARS[b0 >> 2];
    result += CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < len) result += CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (i + 2 < len) result += CHARS[b2 & 0x3f];
  }

  return result;
}

/**
 * Serialises an object to JSON, encodes the UTF-8 bytes as base64url, and
 * returns the result. Used for JWT header and payload segments.
 */
export function base64UrlEncodeJson(obj: object): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
}

/**
 * Strips query-string and fragment components from a URL, returning only the
 * scheme + authority + path as required by RFC 9449 §4.2 for the `htu` claim.
 */
export function normalizeHtu(url: string): string {
  if (typeof URL !== 'undefined') {
    try {
      const { protocol, host, pathname } = new URL(url);
      return `${protocol}//${host}${pathname}`;
    } catch {
      // Fall through
    }
  }

  const withoutFragment = url.split('#')[0] ?? url;
  const withoutQuery = withoutFragment.split('?')[0] ?? withoutFragment;
  return withoutQuery;
}

/**
 * Returns the SubtleCrypto signing algorithm parameters matching the key pair
 * algorithm, used as the first argument to SubtleCrypto.sign().
 */
export function buildSigningParams(
  algorithm: DPoPAlgorithm
): EcdsaParams | RsaPssParams {
  switch (algorithm) {
    case 'ES256': return { name: 'ECDSA', hash: 'SHA-256' };
    case 'PS256': return { name: 'RSA-PSS', saltLength: 32 };
  }
}
