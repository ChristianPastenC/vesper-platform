import { GhostHttpError } from '../../types.js';
import type { FetchWithTrappingOptions } from './types.js';

/**
 * fetchWithTrapping
 *
 * A thin wrapper around the Fetch API that automatically throws a typed
 * GhostHttpError for any non-2xx response, making fetch-based executors
 * fully compatible with the GhostClientCore Error Trapping Matrix.
 */
export const fetchWithTrapping = async (
  url: RequestInfo | URL,
  options: FetchWithTrappingOptions = {},
): Promise<Response> => {
  const { fetchImpl, ...requestInit } = options;

  const fetchFn = fetchImpl ?? globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new TypeError(
      '[GhostLedger] fetchWithTrapping: no fetch implementation available. ' +
        'Pass a fetchImpl option (e.g. node-fetch, cross-fetch) for environments ' +
        'that do not provide a global fetch.',
    );
  }

  const response = await fetchFn(url as RequestInfo, requestInit);

  if (!response.ok) {
    throw new GhostHttpError(response.status, `HTTP ${response.status} ${response.statusText}`);
  }

  return response;
};
