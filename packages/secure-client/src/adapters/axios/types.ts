/**
 * Minimum Axios instance surface required by axiosWithTrapping().
 */
export interface AxiosInstance {
  request<T = unknown>(config: AxiosCompatRequestConfig): Promise<AxiosCompatResponse<T>>;
}

/** Minimum Axios request configuration. */
export interface AxiosCompatRequestConfig {
  url?: string;
  method?: string;
  baseURL?: string;
  headers?: Record<string, string | undefined>;
  params?: unknown;
  data?: unknown;
  timeout?: number;
  [key: string]: unknown;
}

/** Minimum Axios response shape returned by axiosWithTrapping(). */
export interface AxiosCompatResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosCompatRequestConfig;
}

/** Construction options for AxiosAdapter. */
export interface AxiosAdapterOptions {
  axiosInstance: AxiosInstance;
}
