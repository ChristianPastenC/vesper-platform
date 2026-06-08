import { SovereignHttpError } from '../../types.js';
import type { AxiosCompatRequestConfig, AxiosCompatResponse, AxiosInstance } from './types.js';

/**
 * axiosWithTrapping
 *
 * A thin wrapper around an Axios instance that ensures any HTTP error response
 * is surfaced as a typed SovereignHttpError, making the Error Trapping Matrix
 * correctly intercept Axios-based executors even when the Axios instance has
 * a custom `validateStatus` function that suppresses automatic throwing.
 */
export const axiosWithTrapping = async <T>(
  axiosInstance: AxiosInstance,
  config: AxiosCompatRequestConfig,
): Promise<AxiosCompatResponse<T>> => {
  const response = await axiosInstance.request<T>(config);

  if (response.status >= 400) {
    throw new SovereignHttpError(response.status, `HTTP ${response.status} ${response.statusText}`);
  }

  return response;
};
