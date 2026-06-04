import type { ISovereignNetworkAdapter, SovereignAdapterRequest, SovereignAdapterResponse } from '../../contracts/index.js';
import { SovereignHttpError } from '../../types.js';
import { GraphQLRequestError } from './error.js';
import type { GraphQLAdapterOptions, GraphQLErrorShape } from './types.js';
import { decodeBody, decodeHeaders } from '../../binary.js';

/**
 * GraphQLAdapter
 *
 * Concrete implementation of ISovereignNetworkAdapter that sends GraphQL
 * operations as HTTP POST requests to a fixed endpoint.
 *
 * Body contract:
 *   The `body` field of SovereignAdapterRequest MUST be a `Uint8Array`
 *   containing the UTF-8-encoded JSON of the GraphQL request descriptor:
 *     encodeJsonBody({ query, variables?, operationName? })
 *
 * Binary-isolation contract:
 *   • `body` arrives as `Uint8Array | null` — decoded to a string only
 *     immediately before calling fetch(), never stored as a JS string in
 *     any long-lived variable.
 *   • `encodedHeaders` arrives as `Uint8Array` — decoded to a plain object only
 *     immediately before dispatch. The legacy `headers` Record is supported for
 *     backward compatibility but is not zeroizable.
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

    // Decode body only at dispatch time. The decoded string is used once
    // inside fetch() and then released — never stored in a class field or
    // long-lived variable.
    const bodyStr: string =
      config.body !== undefined && config.body !== null
        ? decodeBody(config.body)
        : '{}';

    // Decode headers only at dispatch time and merge with GraphQL defaults.
    const callerHeaders: Record<string, string> =
      config.encodedHeaders !== undefined && config.encodedHeaders.length > 0
        ? decodeHeaders(config.encodedHeaders)
        : (config.headers ?? {});

    const response = await fetchFn(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...callerHeaders,
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

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: envelope.data,
    };
  }
}
