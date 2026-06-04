/**
 * @sovereign/secure-client — network adapter contracts
 *
 * Transport-agnostic interfaces for network adapters.
 */

/**
 * SovereignAdapterRequest
 *
 * Transport-agnostic descriptor of an outbound HTTP request.
 *
 * ── Binary Isolation Invariant ──────────────────────────────────────────────
 *
 * Every field that carries sensitive data at rest in the RAM ledger MUST be
 * stored as a `Uint8Array`, NOT as a plain JS `string` or `object`.
 *
 * Rationale:
 *   • JS strings are immutable, interned, and heap-managed by the engine.
 *     They cannot be deterministically overwritten from userland code.
 *   • `Uint8Array` buffers CAN be zeroed with `.fill(0)`, which is what
 *     `zeroizeBlock()` does to every `LedgerBlock.serializedRequest`.
 *   • A `Record<string,string>` JS object lives as opaque heap nodes;
 *     removing the reference does not erase the key/value strings.
 *
 * Affected fields and their encoding helpers (from `@sovereign/secure-client`):
 *   • `body`           — use `encodeJsonBody(obj)` or `encodeTextBody(str)`
 *   • `encodedHeaders` — use `encodeHeaders({ 'Authorization': token, … })`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface SovereignAdapterRequest {
  /** HTTP method, case-insensitive. */
  method: string;

  /** Absolute URL of the target resource. */
  url: string;

  /**
   * HTTP request headers encoded as a `Uint8Array` (UTF-8, newline-delimited
   * `key: value` pairs).
   *
   * Produce this value with the `encodeHeaders()` helper:
   * ```ts
   * import { encodeHeaders } from '@sovereign/secure-client';
   * const encodedHeaders = encodeHeaders({ 'Authorization': `Bearer ${token}` });
   * ```
   *
   * Transport adapters decode this buffer with `decodeHeaders()` only at the
   * moment of dispatch — it is never stored as a JS `Record` in long-lived state.
   *
   * If both `encodedHeaders` and the legacy `headers` field are present,
   * `encodedHeaders` takes precedence.
   */
  encodedHeaders?: Uint8Array;

  /**
   * @deprecated Use `encodedHeaders` instead.
   *
   * Plain-object headers are NOT zeroizable: `Record<string,string>` keys and
   * values live as interned JS strings in the V8/JSCore heap and cannot be
   * overwritten by `.fill(0)`.  This field is retained for backward
   * compatibility with adapters that do not yet accept `encodedHeaders`.
   *
   * Migration:
   * ```ts
   * // Before (not zeroizable)
   * headers: { 'Authorization': `Bearer ${token}` }
   *
   * // After (zeroizable)
   * encodedHeaders: encodeHeaders({ 'Authorization': `Bearer ${token}` })
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Request body as a binary `Uint8Array`.
   *
   * The `string` variant has been intentionally removed: plain JS strings
   * cannot be byte-level zeroized and may persist in the V8/JSCore heap
   * after the session is purged.
   *
   * Produce this value with the encoding helpers:
   * ```ts
   * import { encodeJsonBody, encodeTextBody } from '@sovereign/secure-client';
   *
   * // JSON payload
   * const body = encodeJsonBody({ amount: 100 });
   *
   * // Raw string (form-encoded, XML, etc.)
   * const body = encodeTextBody('grant_type=client_credentials');
   * ```
   */
  body?: Uint8Array | null;

  /** Abort signal for cooperative request cancellation. */
  signal?: AbortSignal | null;

  /** Request timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * SovereignAdapterResponse<T>
 *
 * Transport-agnostic descriptor of a completed HTTP response.
 */
export interface SovereignAdapterResponse<T = unknown> {
  /** HTTP status code of the response (always 2xx when resolved). */
  readonly status: number;

  /** HTTP status text ('OK', 'Created', etc.). */
  readonly statusText: string;

  /** Response headers normalised to a string-keyed, string-valued record. */
  readonly headers: Readonly<Record<string, string>>;

  /** Parsed response body. */
  readonly data: T;
}

/**
 * ISovereignNetworkAdapter
 *
 * The formal interface that every transport adapter MUST implement.
 *
 * @example Implementing a custom adapter
 * ```ts
 * class MyAdapter implements ISovereignNetworkAdapter {
 *   async request<T>(config: SovereignAdapterRequest): Promise<SovereignAdapterResponse<T>> {
 *     // ... perform the HTTP call ...
 *     if (!response.ok) throw new SovereignHttpError(response.status);
 *     return { status: response.status, statusText: 'OK', headers: {}, data: await response.json() };
 *   }
 * }
 * ```
 */
export interface ISovereignNetworkAdapter {
  /**
   * Executes a single HTTP request described by `config` and returns a typed
   * response on success.
   */
  request<T = unknown>(config: SovereignAdapterRequest): Promise<SovereignAdapterResponse<T>>;
}

/**
 * ISovereignNetworkAdapterFactory<TOptions>
 *
 * DI-friendly factory interface for constructing ISovereignNetworkAdapter
 * instances from a configuration object.
 */
export interface ISovereignNetworkAdapterFactory<TOptions = Record<string, unknown>> {
  /**
   * Creates and returns a new ISovereignNetworkAdapter configured with
   * the supplied options.
   */
  create(options: TOptions): ISovereignNetworkAdapter;
}
