import type { ISovereignNetworkAdapter, SovereignAdapterRequest, SovereignAdapterResponse } from '../contracts.js';
import { SovereignHttpError } from '../types.js';

// ---------------------------------------------------------------------------
// Fetch transport adapter
// ---------------------------------------------------------------------------

/**
 * Options accepted by fetchWithTrapping().
 * Extends the standard RequestInit so any option valid for fetch() is valid here.
 */
export interface FetchWithTrappingOptions extends RequestInit {
  /**
   * Custom fetch implementation to use instead of the global `fetch`.
   * Provide this when working in environments that require a specific
   * implementation: isomorphic-fetch (Angular Universal / NestJS SSR),
   * node-fetch (Node.js < 18), or cross-fetch (universal apps).
   *
   * @default globalThis.fetch
   */
  fetchImpl?: typeof fetch;
}

/**
 * fetchWithTrapping
 *
 * A thin wrapper around the Fetch API that automatically throws a typed
 * SovereignHttpError for any non-2xx response, making fetch-based executors
 * fully compatible with the SovereignClientCore Error Trapping Matrix.
 *
 * WHY THIS IS NEEDED:
 *   The native fetch() API does NOT throw on non-2xx responses — it resolves
 *   with a Response whose `ok` property is false.  Because SovereignClientCore
 *   only intercepts thrown errors (not resolved values), a fetch executor that
 *   forgets to inspect `response.ok` will silently bypass the Error Trapping
 *   Matrix for 503 / 504 and any other freezable status code.
 *
 *   fetchWithTrapping() eliminates this footgun: it inspects `response.ok`
 *   and throws `new SovereignHttpError(response.status)` automatically, which
 *   the Error Trapping Matrix recognises and evaluates against the configured
 *   freeze rules.
 *
 * TRANSPORT COMPATIBILITY:
 *   The optional `fetchImpl` parameter makes this adapter platform-agnostic:
 *   \u2022 Browsers:           omit fetchImpl (uses globalThis.fetch)
 *   \u2022 React Native:       omit fetchImpl (global fetch is provided by the runtime)
 *   \u2022 Node.js \u2265 18:        omit fetchImpl (global fetch available since v18)
 *   \u2022 Node.js 14-17:      pass `require('node-fetch')` as fetchImpl
 *   \u2022 Angular Universal:  pass `require('isomorphic-fetch')` as fetchImpl
 *
 * @param url      URL string or Request object, identical to the first fetch() argument.
 * @param options  Standard RequestInit options plus optional custom fetchImpl.
 * @returns        Resolved Response — always 2xx when this function resolves.
 * @throws         SovereignHttpError(status) for any non-2xx response.
 * @throws         TypeError('Network request failed') on transport-layer failure
 *                 (no response received), which SovereignClientCore also intercepts.
 *
 * @example Basic usage with DPoP (fetch)
 * ```ts
 * import { withDPoP, fetchWithTrapping, SovereignHttpError } from '@sovereign/secure-client';
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: authStore.getToken() }),
 *   async (proof) => {
 *     const res = await fetchWithTrapping('https://api.example.com/transfer', {
 *       method: 'POST',
 *       headers: {
 *         'Authorization': `DPoP ${authStore.getToken()}`,
 *         'DPoP': proof,
 *         'Content-Type': 'application/json',
 *       },
 *       body: JSON.stringify(payload),
 *     });
 *     return res.json() as Promise<TransferResult>;
 *   },
 * );
 * await core.execute('transfer-42', executor, { type: 'transfer', amount: 100 });
 * ```
 *
 * @example React Native with custom fetch implementation
 * ```ts
 * import { fetchWithTrapping } from '@sovereign/secure-client/adapters';
 * import crossFetch from 'cross-fetch';
 *
 * const res = await fetchWithTrapping('/api/data', {
 *   method: 'GET',
 *   fetchImpl: crossFetch,
 * });
 * const data = await res.json();
 * ```
 *
 * @example Node.js 14 / Angular Universal SSR
 * ```ts
 * import { fetchWithTrapping } from '@sovereign/secure-client/adapters';
 * import nodeFetch from 'node-fetch';
 *
 * const res = await fetchWithTrapping('https://api.example.com/data', {
 *   fetchImpl: nodeFetch as unknown as typeof fetch,
 * });
 * ```
 */
export async function fetchWithTrapping(
  url: RequestInfo | URL,
  options: FetchWithTrappingOptions = {}
): Promise<Response> {
  const { fetchImpl, ...requestInit } = options;

  // Resolve the fetch implementation: consumer-supplied, or globalThis.fetch.
  const fetchFn = fetchImpl ?? globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new TypeError(
      '[SovereignCore] fetchWithTrapping: no fetch implementation available. ' +
      'Pass a fetchImpl option (e.g. node-fetch, cross-fetch) for environments ' +
      'that do not provide a global fetch.'
    );
  }

  const response = await fetchFn(url as RequestInfo, requestInit);

  if (!response.ok) {
    // Throw a typed error so SovereignClientCore's Error Trapping Matrix can
    // evaluate the status code against its configured freeze rules.
    throw new SovereignHttpError(
      response.status,
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return response;
}

// ---------------------------------------------------------------------------
// FetchAdapter — ISovereignNetworkAdapter implementation
// ---------------------------------------------------------------------------

/** Construction options for FetchAdapter. */
export interface FetchAdapterOptions {
  /**
   * Custom fetch implementation (node-fetch, cross-fetch, isomorphic-fetch).
   * Omit to use globalThis.fetch.
   */
  fetchImpl?: typeof fetch;
}

/**
 * FetchAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter backed by the Fetch API.
 * Suitable for use in all platforms that provide a global `fetch` or accept
 * a polyfill via `fetchImpl`.
 *
 * Error contract (satisfies ISovereignNetworkAdapter):
 *  - Non-2xx responses   → throws SovereignHttpError(status)
 *  - Transport failure   → throws TypeError('Network request failed') from fetch()
 *
 * @example Direct usage
 * ```ts
 * const adapter = new FetchAdapter();
 * const { data } = await adapter.request<User>({ method: 'GET', url: '/api/me' });
 * ```
 *
 * @example With withDPoP() and SovereignClientCore
 * ```ts
 * const adapter = new FetchAdapter();
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: token }),
 *   async (proof) => {
 *     const { data } = await adapter.request<TransferResult>({
 *       method: 'POST',
 *       url: 'https://api.example.com/transfer',
 *       headers: { 'Authorization': `DPoP ${token}`, 'DPoP': proof,
 *                  'Content-Type': 'application/json' },
 *       body: JSON.stringify(payload),
 *     });
 *     return data;
 *   },
 * );
 * await core.execute('transfer-1', executor, { type: 'transfer' });
 * ```
 *
 * @example Angular DI
 * ```ts
 * providers: [{ provide: SOVEREIGN_ADAPTER, useFactory: () => new FetchAdapter() }]
 * ```
 *
 * @example Node.js 14 (node-fetch)
 * ```ts
 * import nodeFetch from 'node-fetch';
 * const adapter = new FetchAdapter({ fetchImpl: nodeFetch as unknown as typeof fetch });
 * ```
 */
export class FetchAdapter implements ISovereignNetworkAdapter {
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(options: FetchAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl;
  }

  public async request<T = unknown>(
    config: SovereignAdapterRequest
  ): Promise<SovereignAdapterResponse<T>> {
    // fetchWithTrapping handles non-2xx → SovereignHttpError and
    // transport failure → TypeError automatically.
    const resolvedBody: BodyInit | null = config.body instanceof Uint8Array
      ? (config.body as unknown as BodyInit)
      : (config.body ?? null);

    const response = await fetchWithTrapping(config.url, {
      method: config.method,
      // Spread optional fields only when defined (exactOptionalPropertyTypes).
      ...(config.headers !== undefined && { headers: config.headers as HeadersInit }),
      ...(resolvedBody !== null && { body: resolvedBody }),
      ...(config.signal !== undefined
        && config.signal !== null && { signal: config.signal }),
      ...(this.fetchImpl !== undefined && { fetchImpl: this.fetchImpl }),
    });

    // Normalise Headers object to a plain Record<string, string>.
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => { headers[key] = value; });

    const data = await response.json() as T;

    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      data,
    };
  }
}
