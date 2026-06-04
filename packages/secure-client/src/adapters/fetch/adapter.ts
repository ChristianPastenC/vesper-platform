import type { ISovereignNetworkAdapter, SovereignAdapterRequest, SovereignAdapterResponse } from '../../contracts/index.js';
import type { FetchAdapterOptions } from './types.js';
import { fetchWithTrapping } from './functional.js';
import { decodeBody, decodeHeaders } from '../../binary.js';

/**
 * FetchAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter backed by the Fetch API.
 * Suitable for use in all platforms that provide a global `fetch` or accept
 * a polyfill via `fetchImpl`.
 *
 * Binary-isolation contract:
 *   • `body` arrives as `Uint8Array | null` — decoded to a string only
 *     immediately before calling fetch(), never stored as a JS string.
 *   • `encodedHeaders` arrives as `Uint8Array` — decoded to a plain object only
 *     immediately before calling fetch().  The legacy `headers` Record is
 *     supported for backward compatibility but is not zeroizable.
 */
export class FetchAdapter implements ISovereignNetworkAdapter {
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(options: FetchAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl;
  }

  public async request<T = unknown>(
    config: SovereignAdapterRequest
  ): Promise<SovereignAdapterResponse<T>> {

    // Decode headers only at dispatch time — never store the decoded Record
    // in any long-lived variable.
    const resolvedHeaders: Record<string, string> =
      config.encodedHeaders !== undefined && config.encodedHeaders.length > 0
        ? decodeHeaders(config.encodedHeaders)
        : (config.headers ?? {});

    // Decode body only at dispatch time — `decodeBody` is a pure one-shot call.
    const resolvedBody: BodyInit | null =
      config.body !== undefined && config.body !== null
        ? decodeBody(config.body)
        : null;

    const response = await fetchWithTrapping(config.url, {
      method: config.method,
      ...(Object.keys(resolvedHeaders).length > 0 && { headers: resolvedHeaders as HeadersInit }),
      ...(resolvedBody !== null && { body: resolvedBody }),
      ...(config.signal !== undefined
        && config.signal !== null && { signal: config.signal }),
      ...(this.fetchImpl !== undefined && { fetchImpl: this.fetchImpl }),
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });

    const data = await response.json() as T;

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
    };
  }
}
