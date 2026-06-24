import type { DPoPAlgorithm } from './types.js';

import { getNativeClient } from '../ledger/queue.js';

/**
 * Encodes a raw byte array as a base64url string (RFC 4648 §5, no padding).
 * Offloaded to C++ core for optimal performance.
 */
export const base64UrlEncode = (bytes: Uint8Array): string => {
  // Use exact ArrayBuffer from view to avoid memory copies over JSI
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return getNativeClient().base64UrlEncode(buffer);
};

/**
 * Serialises an object to JSON, encodes the UTF-8 bytes as base64url, and
 * returns the result. Used for JWT header and payload segments.
 */
export const base64UrlEncodeJson = (obj: object): string => {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
};

/**
 * Strips query-string and fragment components from a URL, returning only the
 * scheme + authority + path as required by RFC 9449 §4.2 for the `htu` claim.
 */
export const normalizeHtu = (url: string): string => {
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
};

/**
 * Returns the SubtleCrypto signing algorithm parameters matching the key pair
 * algorithm, used as the first argument to SubtleCrypto.sign().
 */
export const buildSigningParams = (algorithm: DPoPAlgorithm): EcdsaParams | RsaPssParams => {
  switch (algorithm) {
    case 'ES256':
      return { name: 'ECDSA', hash: 'SHA-256' };
    case 'PS256':
      return { name: 'RSA-PSS', saltLength: 32 };
  }
};
