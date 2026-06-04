/**
 * @sovereign/secure-client — binary encoding utilities
 *
 * Zero-dependency helpers for converting JavaScript values into
 * binary Uint8Array buffers suitable for use with SovereignAdapterRequest.
 *
 * Why this matters:
 *   SovereignAdapterRequest.body is typed as `Uint8Array | null` (not `string`)
 *   so that every byte of request payload lives in a typed binary buffer that
 *   can be deterministically overwritten with `.fill(0)` by the active
 *   zeroization routines in SovereignMemoryQueue.  Plain JS strings are
 *   immutable, interned, and heap-managed by the engine — they cannot be
 *   zeroed from userland code.
 *
 * Usage:
 *   import { encodeJsonBody, encodeTextBody, encodeHeaders } from '@sovereign/secure-client';
 *
 *   const body    = encodeJsonBody({ amount: 100, currency: 'USD' });
 *   const headers = encodeHeaders({ 'Authorization': `Bearer ${token}` });
 *
 *   await core.executeRequest('tx-42', { method: 'POST', url, body, headers });
 */

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

// ---------------------------------------------------------------------------
// Body encoding
// ---------------------------------------------------------------------------

/**
 * Serializes a JSON-serializable value to a UTF-8 `Uint8Array`.
 *
 * This is the canonical way to produce a request body for
 * `SovereignAdapterRequest` when the payload is a JSON object.
 * The resulting buffer:
 *  - Can be passed directly as `body` in a `SovereignAdapterRequest`.
 *  - Can be overwritten with `.fill(0)` by active zeroization routines.
 *  - Will be decoded back to a string only at the last moment inside the
 *    transport adapter (Fetch/Axios), not stored as a JS string in RAM.
 *
 * @example
 * ```ts
 * const body = encodeJsonBody({ amount: 100, currency: 'USD' });
 * // body is a Uint8Array containing the UTF-8 bytes of the JSON string
 * ```
 */
export function encodeJsonBody(value: unknown): Uint8Array {
  return TEXT_ENCODER.encode(JSON.stringify(value));
}

/**
 * Encodes a plain string to a UTF-8 `Uint8Array`.
 *
 * Use when the body is already a string (e.g. raw XML, form-encoded data,
 * or a pre-serialized JSON string) that needs to be wrapped in a binary
 * buffer for zeroization compatibility.
 *
 * @example
 * ```ts
 * const body = encodeTextBody('grant_type=client_credentials&scope=read');
 * ```
 */
export function encodeTextBody(text: string): Uint8Array {
  return TEXT_ENCODER.encode(text);
}

// ---------------------------------------------------------------------------
// Header encoding / decoding  (internal use by adapters)
// ---------------------------------------------------------------------------

/**
 * Serializes an HTTP headers map to a UTF-8 `Uint8Array`.
 *
 * Headers contain highly sensitive data (Authorization, DPoP tokens, API keys).
 * Encoding them into a binary buffer allows the active zeroization routines to
 * overwrite their contents when the session expires or is purged.
 *
 * The serialization format is a newline-delimited sequence of `key: value`
 * pairs (HTTP/1.1 field-line grammar), which is both compact and trivially
 * parseable by `decodeHeaders()`.
 *
 * @example
 * ```ts
 * const headers = encodeHeaders({
 *   'Authorization': `DPoP ${token}`,
 *   'Content-Type':  'application/json',
 * });
 * ```
 */
export function encodeHeaders(headers: Record<string, string>): Uint8Array {
  const lines = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  return TEXT_ENCODER.encode(lines);
}

/**
 * Deserializes a `Uint8Array` produced by `encodeHeaders()` back to a
 * `Record<string, string>`.
 *
 * Called exclusively inside transport adapters immediately before the HTTP
 * request is dispatched — never stored as a JS object in long-lived state.
 *
 * Returns an empty object for zero-length buffers (zeroized or absent headers).
 */
export function decodeHeaders(buffer: Uint8Array): Record<string, string> {
  if (buffer.length === 0) return {};

  const text = TEXT_DECODER.decode(buffer);
  const result: Record<string, string> = {};

  for (const line of text.split('\n')) {
    const colonIndex = line.indexOf(': ');
    if (colonIndex === -1) continue;
    const key   = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 2);
    if (key.length > 0) result[key] = value;
  }

  return result;
}

/**
 * Decodes a `Uint8Array` body back to a UTF-8 string.
 *
 * Called exclusively inside transport adapters at the last moment before the
 * HTTP request is dispatched.  Never store the decoded string in long-lived
 * variables.
 *
 * Returns an empty string for zero-length buffers (zeroized or absent bodies).
 */
export function decodeBody(buffer: Uint8Array): string {
  return TEXT_DECODER.decode(buffer);
}
