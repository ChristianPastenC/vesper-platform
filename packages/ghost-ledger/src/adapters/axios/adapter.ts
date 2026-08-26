import type {
  ISovereignNetworkAdapter,
  SovereignAdapterRequest,
  SovereignAdapterResponse,
} from '../../contracts/index.js';
import type { AxiosAdapterOptions, AxiosCompatRequestConfig, AxiosInstance } from './types.js';
import { axiosWithTrapping } from './functional.js';
import { decodeBody, decodeHeaders } from '../../binary.js';

/**
 * AxiosAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter backed by an Axios
 * (or Axios-compatible) instance.
 *
 * Binary-isolation contract:
 *   • `body` arrives as `Uint8Array | null` — decoded to a string only
 *     immediately before calling axiosWithTrapping(), never stored as a
 *     plain JS string in any long-lived state.
 *   • `encodedHeaders` arrives as `Uint8Array` — decoded to a plain object only
 *     immediately before dispatch. The legacy `headers` Record is supported for
 *     backward compatibility but is not zeroizable.
 */
export class AxiosAdapter implements ISovereignNetworkAdapter {
  private readonly axiosInstance: AxiosInstance;

  constructor(options: AxiosAdapterOptions) {
    this.axiosInstance = options.axiosInstance;
  }

  public async request<T = unknown>(
    config: SovereignAdapterRequest,
  ): Promise<SovereignAdapterResponse<T>> {
    // Decode headers only at dispatch time.
    const resolvedHeaders: Record<string, string | undefined> =
      config.encodedHeaders !== undefined && config.encodedHeaders.length > 0
        ? decodeHeaders(config.encodedHeaders)
        : (config.headers ?? {});

    // Decode body only at dispatch time. Axios accepts string | Uint8Array
    // as `data`, but we decode to string here so the deserialized form is
    // transient and never stored in a long-lived variable.
    const resolvedData: string | undefined =
      config.body !== undefined && config.body !== null ? decodeBody(config.body) : undefined;

    const axiosConfig: AxiosCompatRequestConfig = {
      method: config.method,
      url: config.url,
      ...(Object.keys(resolvedHeaders).length > 0 && { headers: resolvedHeaders }),
      ...(resolvedData !== undefined && { data: resolvedData }),
      ...(config.timeoutMs !== undefined && { timeout: config.timeoutMs }),
    };

    const response = await axiosWithTrapping<T>(this.axiosInstance, axiosConfig);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    };
  }
}
