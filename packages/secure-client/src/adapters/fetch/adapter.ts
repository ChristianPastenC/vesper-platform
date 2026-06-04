import type { ISovereignNetworkAdapter, SovereignAdapterRequest, SovereignAdapterResponse } from '../../contracts/index.js';
import type { FetchAdapterOptions } from './types.js';
import { fetchWithTrapping } from './functional.js';

/**
 * FetchAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter backed by the Fetch API.
 * Suitable for use in all platforms that provide a global `fetch` or accept
 * a polyfill via `fetchImpl`.
 */
export class FetchAdapter implements ISovereignNetworkAdapter {
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(options: FetchAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl;
  }

  public async request<T = unknown>(
    config: SovereignAdapterRequest
  ): Promise<SovereignAdapterResponse<T>> {
    const resolvedBody: BodyInit | null = config.body instanceof Uint8Array
      ? (config.body as unknown as BodyInit)
      : (config.body ?? null);

    const response = await fetchWithTrapping(config.url, {
      method: config.method,
      ...(config.headers !== undefined && { headers: config.headers as HeadersInit }),
      ...(resolvedBody !== null && { body: resolvedBody }),
      ...(config.signal !== undefined
        && config.signal !== null && { signal: config.signal }),
      ...(this.fetchImpl !== undefined && { fetchImpl: this.fetchImpl }),
    });

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
