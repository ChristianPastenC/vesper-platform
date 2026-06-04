/**
 * @sovereign/secure-client — network adapter contracts
 *
 * Transport-agnostic interfaces for network adapters.
 */

/**
 * SovereignAdapterRequest
 *
 * Transport-agnostic descriptor of an outbound HTTP request.
 */
export interface SovereignAdapterRequest {
  /** HTTP method, case-insensitive. */
  method: string;

  /** Absolute URL of the target resource. */
  url: string;

  /** HTTP request headers. */
  headers?: Record<string, string>;

  /** Request body. */
  body?: string | Uint8Array | null;

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
