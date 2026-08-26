import {
  encodeTextBody,
  decodeBody,
  encodeJsonBody,
  encodeHeaders,
  appendHeaderToBinary,
  decodeHeaders,
  serializeAdapterRequest,
  deserializeAdapterRequest
} from '../binary.js';

describe('Binary Utils', () => {
  it('should encode and decode text correctly', () => {
    const text = 'SovereignSecureClient Test String 123!@#';
    const encoded = encodeTextBody(text);

    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = decodeBody(encoded);
    expect(decoded).toBe(text);
  });

  it('should encode json body', () => {
    const obj = { key: 'value' };
    const encoded = encodeJsonBody(obj);
    expect(decodeBody(encoded)).toBe('{"key":"value"}');
  });

  it('should encode and decode headers', () => {
    const headers = { 'Content-Type': 'application/json', 'X-Custom': 'test' };
    const encoded = encodeHeaders(headers);
    const decoded = decodeHeaders(encoded);
    expect(decoded['Content-Type']).toBe('application/json');
    expect(decoded['X-Custom']).toBe('test');
  });

  it('should return empty object for empty headers', () => {
    expect(decodeHeaders(new Uint8Array(0))).toEqual({});
  });

  it('should append header to binary', () => {
    const encoded = encodeHeaders({ 'Content-Type': 'application/json' });
    const appended = appendHeaderToBinary(encoded, 'X-New', 'val');
    const decoded = decodeHeaders(appended);
    expect(decoded['Content-Type']).toBe('application/json');
    expect(decoded['X-New']).toBe('val');
  });

  it('should append header to empty binary', () => {
    const empty = new Uint8Array(0);
    const appended = appendHeaderToBinary(empty, 'X-New', 'val');
    const decoded = decodeHeaders(appended);
    expect(decoded['X-New']).toBe('val');
  });

  it('should serialize and deserialize adapter request', () => {
    const request = {
      method: 'POST',
      url: 'https://api.com',
      headers: { 'Auth': '123' },
      body: new Uint8Array([1, 2, 3]),
      timeoutMs: 1000
    };

    const serialized = serializeAdapterRequest(request);
    const deserialized = deserializeAdapterRequest(serialized);

    expect(deserialized).toBeDefined();
    expect(deserialized!.method).toBe('POST');
    expect(deserialized!.url).toBe('https://api.com');
    expect(deserialized!.timeoutMs).toBe(1000);

    const decodedHeaders = decodeHeaders(deserialized!.encodedHeaders!);
    expect(decodedHeaders['Auth']).toBe('123');

    expect(Array.from(deserialized!.body!)).toEqual([1, 2, 3]);
  });

  it('should return null for empty deserialize buffer', () => {
    expect(deserializeAdapterRequest(new Uint8Array(0))).toBeNull();
    expect(deserializeAdapterRequest(new Uint8Array([0, 0, 0, 0]))).toBeNull();
  });
});
