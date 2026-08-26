import { SovereignHttpError } from '../../types.js';
import { GraphQLRequestError } from './error.js';
import type { GraphQLErrorShape, GraphQLRequest, GraphQLRequestOptions } from './types.js';

/**
 * graphqlWithTrapping
 *
 * A framework-agnostic GraphQL POST client that integrates with the
 * SovereignClientCore Error Trapping Matrix and works in all supported
 * JS runtimes without any GraphQL client dependency.
 */
export const graphqlWithTrapping = async <T>(
  url: string,
  request: GraphQLRequest,
  options: GraphQLRequestOptions = {},
): Promise<T> => {
  const { headers = {}, fetchImpl, signal } = options;
  const fetchFn = fetchImpl ?? globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new TypeError(
      '[SovereignCore] graphqlWithTrapping: no fetch implementation available. ' +
        'Pass a fetchImpl option (e.g. node-fetch, cross-fetch) for environments ' +
        'that do not provide a global fetch.',
    );
  }

  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      query: request.query,
      ...(request.variables !== undefined && { variables: request.variables }),
      ...(request.operationName !== undefined && { operationName: request.operationName }),
    }),
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new SovereignHttpError(response.status, `HTTP ${response.status} ${response.statusText}`);
  }

  const envelope = (await response.json()) as {
    data?: T;
    errors?: GraphQLErrorShape[];
  };

  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
    throw new GraphQLRequestError(envelope.errors, envelope.data);
  }

  if (envelope.data === undefined || envelope.data === null) {
    throw new GraphQLRequestError([
      { message: 'GraphQL response contained no data and no errors.' },
    ]);
  }

  return envelope.data;
};
