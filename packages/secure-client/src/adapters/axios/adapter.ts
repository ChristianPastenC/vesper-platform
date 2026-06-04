import type { ISovereignNetworkAdapter, SovereignAdapterRequest, SovereignAdapterResponse } from '../../contracts/index.js';
import type { AxiosAdapterOptions, AxiosInstance } from './types.js';
import { axiosWithTrapping } from './functional.js';

/**
 * AxiosAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter backed by an Axios
 * (or Axios-compatible) instance.
 */
export class AxiosAdapter implements ISovereignNetworkAdapter {
  private readonly axiosInstance: AxiosInstance;

  constructor(options: AxiosAdapterOptions) {
    this.axiosInstance = options.axiosInstance;
  }

  public async request<T = unknown>(
    config: SovereignAdapterRequest
  ): Promise<SovereignAdapterResponse<T>> {
    const response = await axiosWithTrapping<T>(this.axiosInstance, {
      method: config.method,
      url: config.url,
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
