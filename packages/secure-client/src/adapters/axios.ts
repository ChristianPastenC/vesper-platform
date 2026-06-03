import type { ISovereignNetworkAdapter, SovereignAdapterRequest, SovereignAdapterResponse } from '../contracts.js';
import { SovereignHttpError } from '../types.js';

// ---------------------------------------------------------------------------
// Duck-type interfaces — no hard `axios` peer dependency required
// ---------------------------------------------------------------------------

/**
 * Minimum Axios instance surface required by axiosWithTrapping().
 *
 * Any Axios v0.x or v1.x instance (`axios`, `axios.create({...})`) satisfies
 * this interface without needing to import Axios types directly.
 *
 * @example
 * ```ts
 * import axios from 'axios';
 * const instance: AxiosInstance = axios.create({ baseURL: 'https://api.example.com' });
 * ```
 */
export interface AxiosInstance {
  request<T = unknown>(config: AxiosCompatRequestConfig): Promise<AxiosCompatResponse<T>>;
}

/**
 * Minimum Axios request configuration.
 * Maps 1-to-1 with Axios's InternalAxiosRequestConfig — any valid Axios config
 * is structurally compatible.
 */
export interface AxiosCompatRequestConfig {
  url?: string;
  method?: string;
  baseURL?: string;
  headers?: Record<string, string | undefined>;
  params?: unknown;
  data?: unknown;
  timeout?: number;
  /** Any additional Axios-specific options are passed through. */
  [key: string]: unknown;
}

/**
 * Minimum Axios response shape returned by axiosWithTrapping().
 * Matches Axios's AxiosResponse<T> structurally.
 */
export interface AxiosCompatResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosCompatRequestConfig;
}

// ---------------------------------------------------------------------------
// axiosWithTrapping
// ---------------------------------------------------------------------------

/**
 * axiosWithTrapping
 *
 * A thin wrapper around an Axios instance that ensures any HTTP error response
 * is surfaced as a typed SovereignHttpError, making the Error Trapping Matrix
 * correctly intercept Axios-based executors even when the Axios instance has
 * a custom `validateStatus` function that suppresses automatic throwing.
 *
 * WHY THIS IS NEEDED:
 *   By default Axios throws an AxiosError for non-2xx responses.  SovereignCore
 *   already understands AxiosError shapes (reads `error.isAxiosError` and
 *   `error.response.status`) so the Error Trapping Matrix works out-of-the-box
 *   for a stock Axios instance.
 *
 *   However, a common pattern in enterprise apps is overriding `validateStatus`
 *   on the instance or per-request to return `true` for all statuses (e.g. to
 *   read error response bodies).  In that case Axios resolves instead of throws,
 *   silently bypassing the matrix.
 *
 *   axiosWithTrapping() detects this scenario: if the resolved response carries
 *   a status ≥ 400 it throws `new SovereignHttpError(status)` so the matrix
 *   can evaluate the freeze rules regardless of validateStatus.
 *
 * NO HARD DEPENDENCY:
 *   The function accepts the duck-typed AxiosInstance interface, so no `axios`
 *   package import is required inside the library — the consumer supplies the
 *   instance.  This keeps the bundle lean and avoids version conflicts.
 *
 * TRANSPORT COMPATIBILITY:
 *   Works with any Axios-compatible library:
 *   • axios (v0.x and v1.x)
 *   • axios-fetch-adapter (React Native)
 *   • redaxios (lightweight fetch-backed Axios-compatible library)
 *
 * @param axiosInstance  Any Axios instance (or Axios-compatible client).
 * @param config         Standard Axios request config.
 * @returns              Resolved AxiosCompatResponse — always 2xx when this resolves.
 * @throws               SovereignHttpError(status) for any 4xx / 5xx response.
 * @throws               AxiosError (isAxiosError: true, !response) on transport failure,
 *                       which SovereignClientCore Stage 1 detection intercepts automatically.
 *
 * @example With DPoP + withDPoP (Angular / React / React Native)
 * ```ts
 * import axios from 'axios';
 * import { withDPoP, axiosWithTrapping } from '@sovereign/secure-client';
 *
 * const api = axios.create({ baseURL: 'https://api.example.com' });
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: authStore.getToken() }),
 *   async (proof) => {
 *     const { data } = await axiosWithTrapping<TransferResult>(api, {
 *       method: 'POST',
 *       url: '/transfer',
 *       data: payload,
 *       headers: {
 *         'Authorization': `DPoP ${authStore.getToken()}`,
 *         'DPoP': proof,
 *       },
 *     });
 *     return data;
 *   },
 * );
 * await core.execute('transfer-42', executor, { type: 'transfer', amount: 100 });
 * ```
 *
 * @example Without DPoP (standard REST call with error trapping)
 * ```ts
 * import axios from 'axios';
 * import { axiosWithTrapping } from '@sovereign/secure-client/adapters';
 *
 * const api = axios.create({ baseURL: 'https://api.example.com' });
 *
 * // Still benefits from Error Trapping Matrix even without DPoP:
 * await core.execute(
 *   'fetch-user',
 *   () => axiosWithTrapping<User>(api, { method: 'GET', url: '/users/me' })
 *         .then(r => r.data),
 *   { resource: 'user' },
 * );
 * ```
 *
 * @example With redaxios (React Native / edge runtimes)
 * ```ts
 * import redaxios from 'redaxios';
 * import { axiosWithTrapping } from '@sovereign/secure-client/adapters';
 *
 * const { data } = await axiosWithTrapping<Profile>(redaxios, {
 *   method: 'GET',
 *   url: 'https://api.example.com/profile',
 *   headers: { 'Authorization': `Bearer ${token}` },
 * });
 * ```
 */
export async function axiosWithTrapping<T>(
  axiosInstance: AxiosInstance,
  config: AxiosCompatRequestConfig
): Promise<AxiosCompatResponse<T>> {
  // Let Axios execute the request. For a default instance this will throw an
  // AxiosError on non-2xx (already handled by SovereignCore matrix Stage 1/2).
  const response = await axiosInstance.request<T>(config);

  // Guard: if validateStatus was overridden and allowed a non-2xx through,
  // convert to SovereignHttpError so the matrix can evaluate freeze rules.
  if (response.status >= 400) {
    throw new SovereignHttpError(
      response.status,
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return response;
}

// ---------------------------------------------------------------------------
// AxiosAdapter — ISovereignNetworkAdapter implementation
// ---------------------------------------------------------------------------

/** Construction options for AxiosAdapter. */
export interface AxiosAdapterOptions {
  /**
   * Axios (or Axios-compatible) instance to delegate requests to.
   * Use `axios.create({ baseURL, headers })` to pre-configure defaults.
   */
  axiosInstance: AxiosInstance;
}

/**
 * AxiosAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter backed by an Axios
 * (or Axios-compatible) instance. Suitable for Angular HttpClient-free apps,
 * React / React Native projects already using Axios, and NestJS micro-services.
 *
 * Error contract (satisfies ISovereignNetworkAdapter):
 *  - Non-2xx responses   → throws SovereignHttpError(status)
 *    (also handles the validateStatus override case via axiosWithTrapping)
 *  - Transport failure   → AxiosError with isAxiosError: true, !response
 *    (SovereignClientCore Stage 1 matrix intercepts this automatically)
 *
 * @example With withDPoP() and SovereignClientCore
 * ```ts
 * import axios from 'axios';
 * import { AxiosAdapter, withDPoP } from '@sovereign/secure-client';
 *
 * const adapter = new AxiosAdapter({
 *   axiosInstance: axios.create({ baseURL: 'https://api.example.com' }),
 * });
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: token }),
 *   async (proof) => {
 *     const { data } = await adapter.request<TransferResult>({
 *       method: 'POST',
 *       url: '/transfer',
 *       headers: { 'Authorization': `DPoP ${token}`, 'DPoP': proof },
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
 * providers: [{
 *   provide: SOVEREIGN_ADAPTER,
 *   useFactory: (http: HttpClient) => new AxiosAdapter({ axiosInstance: axios }),
 * }]
 * ```
 *
 * @example React Native with redaxios
 * ```ts
 * import redaxios from 'redaxios';
 * const adapter = new AxiosAdapter({ axiosInstance: redaxios });
 * ```
 */
export class AxiosAdapter implements ISovereignNetworkAdapter {
  private readonly axiosInstance: AxiosInstance;

  constructor(options: AxiosAdapterOptions) {
    this.axiosInstance = options.axiosInstance;
  }

  public async request<T = unknown>(
    config: SovereignAdapterRequest
  ): Promise<SovereignAdapterResponse<T>> {
    // axiosWithTrapping handles non-2xx → SovereignHttpError (including
    // the validateStatus override edge case) and forwards AxiosError for
    // transport failures so SovereignClientCore Stage 1 can intercept.
    const response = await axiosWithTrapping<T>(this.axiosInstance, {
      method: config.method,
      url: config.url,
      // Spread optional fields only when defined (exactOptionalPropertyTypes).
      ...(config.headers !== undefined && { headers: config.headers }),
      ...(config.body !== undefined && { data: config.body }),
      ...(config.timeoutMs !== undefined && { timeout: config.timeoutMs }),
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    };
  }
}
