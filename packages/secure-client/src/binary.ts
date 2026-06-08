/**
 * @sovereign/secure-client — binary encoding utilities
 *
 * Encodes request metadata into flat byte-arrays.
 * Plain JS strings are immutable and cannot be zeroed in RAM. By encoding
 * headers/body to Uint8Array, we can wipe them deterministically with `.fill(0)`.
 */

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export function encodeJsonBody(value: unknown): Uint8Array {
  return TEXT_ENCODER.encode(JSON.stringify(value));
}

export function encodeTextBody(text: string): Uint8Array {
  return TEXT_ENCODER.encode(text);
}

export function encodeHeaders(headers: Record<string, string>): Uint8Array {
  const lines = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  return TEXT_ENCODER.encode(lines);
}

export function appendHeaderToBinary(
  encodedHeaders: Uint8Array,
  key: string,
  value: string
): Uint8Array {
  const toAppend = TEXT_ENCODER.encode(`${key}: ${value}\n`);
  const result = new Uint8Array(encodedHeaders.length + toAppend.length);
  if (encodedHeaders.length > 0) {
    result.set(encodedHeaders, 0);
  }
  result.set(toAppend, encodedHeaders.length);
  return result;
}

export function decodeHeaders(buffer: Uint8Array): Record<string, string> {
  if (buffer.length === 0) return {};

  const text = TEXT_DECODER.decode(buffer);
  const result: Record<string, string> = {};

  for (const line of text.split('\n')) {
    const colonIndex = line.indexOf(': ');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 2);
    if (key.length > 0) result[key] = value;
  }

  return result;
}

export function decodeBody(buffer: Uint8Array): string {
  return TEXT_DECODER.decode(buffer);
}

/**
 * Packs request parameters into a flat byte layout:
 * [4B method length][method UTF-8][4B url length][url UTF-8]
 * [4B headers length][encodedHeaders UTF-8][4B body length][body bytes][4B timeoutMs]
 */
export function serializeAdapterRequest(
  request: {
    method: string;
    url: string;
    encodedHeaders?: Uint8Array;
    headers?: Record<string, string>;
    body?: Uint8Array | null;
    timeoutMs?: number;
  }
): Uint8Array {
  const method = TEXT_ENCODER.encode(request.method);
  const url = TEXT_ENCODER.encode(request.url);

  const hdrs: Uint8Array =
    request.encodedHeaders !== undefined
      ? request.encodedHeaders
      : request.headers !== undefined
        ? encodeHeaders(request.headers)
        : new Uint8Array(0);

  const body: Uint8Array =
    request.body !== undefined && request.body !== null
      ? request.body
      : new Uint8Array(0);

  const timeoutMs = request.timeoutMs ?? 0;

  const totalLength =
    4 + method.length +
    4 + url.length +
    4 + hdrs.length +
    4 + body.length +
    4;

  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  const writeSegment = (segment: Uint8Array): void => {
    view.setUint32(offset, segment.length, false);
    offset += 4;
    buffer.set(segment, offset);
    offset += segment.length;
  };

  writeSegment(method);
  writeSegment(url);
  writeSegment(hdrs);
  writeSegment(body);
  view.setUint32(offset, timeoutMs, false);

  return buffer;
}

import type { SovereignAdapterRequest } from './contracts/index.js';

export function deserializeAdapterRequest(
  buffer: Uint8Array
): Pick<SovereignAdapterRequest, 'method' | 'url' | 'encodedHeaders' | 'body' | 'timeoutMs'> | null {
  if (buffer.length === 0) return null;

  const firstUint32 = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0, false);
  if (firstUint32 === 0) return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  const readSegment = (): Uint8Array => {
    const length = view.getUint32(offset, false);
    offset += 4;
    const segment = new Uint8Array(buffer.subarray(offset, offset + length));
    offset += length;
    return segment;
  };

  const method = TEXT_DECODER.decode(readSegment());
  const url = TEXT_DECODER.decode(readSegment());
  const hdrsBuffer = readSegment();
  const bodyBuffer = readSegment();
  const timeoutMs = view.getUint32(offset, false);

  return {
    method,
    url,
    encodedHeaders: hdrsBuffer,
    body: bodyBuffer.length > 0 ? bodyBuffer : null,
    ...(timeoutMs > 0 && { timeoutMs }),
  };
}
