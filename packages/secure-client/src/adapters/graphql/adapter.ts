import type { ISovereignNetworkAdapter, SovereignAdapterRequest, SovereignAdapterResponse } from '../../contracts/index.js';
import { SovereignHttpError } from '../../types.js';
import { GraphQLRequestError } from './error.js';
import type { GraphQLAdapterOptions, GraphQLErrorShape } from './types.js';

/**
 * GraphQLAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter that sends GraphQL
 * operations as HTTP POST requests to a fixed endpoint.
 *
 * Body contract:
 *   The `body` field of SovereignAdapterRequest MUST be a JSON string
 *   serialising the GraphQL request descriptor:
 *     JSON.stringify({ query, variables?, operationName? })
 */
export class GraphQLAdapter implements ISovereignNetworkAdapter {
  private readonly url: string;
  private readonly fetchImpl: typeof fetch | undefined;

  constructor(options: GraphQLAdapterOptions) {
    this.url = options.url;
    this.fetchImpl = options.fetchImpl;
  }

  public async request<T = unknown>(
    config: SovereignAdapterRequest
  ): Promise<SovereignAdapterResponse<T>> {
    const fetchFn = this.fetchImpl ?? globalThis.fetch;

    if (typeof fetchFn !== 'function') {
      throw new TypeError(
        '[SovereignCore] GraphQLAdapter: no fetch implementation available. ' +
        'Pass a fetchImpl option for environments without a global fetch.'
      );
    }

    const bodyStr = config.body instanceof Uint8Array
      ? new TextDecoder().decode(config.body)
      : (config.body ?? '{}');

    const response = await fetchFn(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers,
      },
      body: bodyStr,
      signal: config.signal ?? null,
    });

    if (!response.ok) {
      throw new SovereignHttpError(
        response.status,
        `HTTP ${response.status} ${response.statusText}`
      );
    }

    const envelope = await response.json() as { data?: T; errors?: GraphQLErrorShape[] };

    if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
      throw new GraphQLRequestError(envelope.errors, envelope.data);
    }

    if (envelope.data === undefined || envelope.data === null) {
      throw new GraphQLRequestError(
        [{ message: 'GraphQL response contained no data and no errors.' }]
      );
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => { headers[key] = value; });

    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      data: envelope.data,
    };
  }
}
