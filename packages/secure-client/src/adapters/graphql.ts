import { SovereignHttpError } from '../types.js';

// ---------------------------------------------------------------------------
// GraphQL typed error — NOT a network failure, NOT frozen by the matrix
// ---------------------------------------------------------------------------

/**
 * A single error entry inside a GraphQL `errors` array (per the GraphQL spec,
 * June 2018 §7.1.2).
 */
export interface GraphQLErrorShape {
  /** Human-readable description of the error. */
  message: string;
  /**
   * Path in the response data where the error occurred.
   * Absent when the error is not associated with a specific field.
   */
  path?: ReadonlyArray<string | number>;
  /** Source location in the query document (line + column), if available. */
  locations?: ReadonlyArray<{ line: number; column: number }>;
  /** Arbitrary extension data provided by the server (error codes, etc.). */
  extensions?: Record<string, unknown>;
}

/**
 * Thrown when the GraphQL server returns an `errors` array in its response.
 *
 * GraphQL-level errors mean the request REACHED the server and was processed —
 * they are application-level failures (validation, resolver errors, permissions)
 * and MUST NOT be frozen by the Error Trapping Matrix.
 *
 * This is intentionally separate from SovereignHttpError (HTTP transport errors)
 * so the consumer can catch them independently and display field-level messages.
 */
export class GraphQLRequestError extends Error {
  public readonly errors: ReadonlyArray<GraphQLErrorShape>;
  /**
   * Partial data that the server may have returned alongside the errors.
   * GraphQL allows partial success — some fields may be resolved even when
   * others fail.
   */
  public readonly partialData: unknown;

  constructor(errors: GraphQLErrorShape[], partialData?: unknown) {
    super(errors.map(e => e.message).join(' | '));
    this.name       = 'GraphQLRequestError';
    this.errors     = errors;
    this.partialData = partialData;
    Object.setPrototypeOf(this, GraphQLRequestError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

/** A standard GraphQL request body (POST). */
export interface GraphQLRequest {
  /** The query or mutation document string. */
  query: string;
  /** Input variables for the operation. */
  variables?: Record<string, unknown>;
  /** Optional operation name (required when the document has multiple operations). */
  operationName?: string;
}

/** Options accepted by graphqlWithTrapping(). */
export interface GraphQLRequestOptions {
  /**
   * HTTP headers merged into the request.
   * Use this to pass `Authorization`, `DPoP`, and any custom headers.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation.
   * Required on Node.js < 18 (pass `node-fetch`), Angular Universal
   * (pass `isomorphic-fetch`), or when a per-request fetch wrapper is needed.
   *
   * @default globalThis.fetch
   */
  fetchImpl?: typeof fetch;

  /**
   * AbortSignal for request cancellation.
   * Passed directly to the underlying fetch() call.
   */
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// graphqlWithTrapping
// ---------------------------------------------------------------------------

/**
 * graphqlWithTrapping
 *
 * A framework-agnostic GraphQL POST client that integrates with the
 * SovereignClientCore Error Trapping Matrix and works in all supported
 * JS runtimes without any GraphQL client dependency.
 *
 * Works with any GraphQL backend regardless of server implementation:
 * Apollo Server, GraphQL Yoga, Hasura, AWS AppSync, Pothos, etc.
 *
 * ERROR HANDLING STRATEGY:
 *
 *   HTTP transport errors   → SovereignHttpError(status)
 *     Caught by matrix Stage 2. 503/504 freeze the session; others propagate.
 *     Network failures (DNS, connection refused) throw TypeError which matrix
 *     Stage 1 intercepts.
 *
 *   GraphQL `errors` array  → GraphQLRequestError
 *     Application-level failures — NOT frozen, propagate immediately to the
 *     caller so field-level error messages can be displayed.
 *
 *   Partial success         → GraphQLRequestError with partialData populated
 *     Occurs when some resolvers succeed and others fail. The consumer can
 *     decide whether to use the partial data or treat it as a full failure.
 *
 * NO APOLLO / URQL DEPENDENCY:
 *   The function uses the native Fetch API (or a supplied fetchImpl) to make
 *   the GraphQL POST request. If you are already using Apollo Client with its
 *   full link chain, prefer the Apollo-specific usage pattern shown below.
 *
 * PLATFORM COMPATIBILITY:
 *   • Browsers:           omit fetchImpl
 *   • React Native:       omit fetchImpl (global fetch available in RN runtime)
 *   • Node.js ≥ 18:       omit fetchImpl
 *   • Node.js 14-17:      pass `require('node-fetch')` as fetchImpl
 *   • Angular Universal:  pass `require('isomorphic-fetch')` as fetchImpl
 *
 * @param url      GraphQL endpoint URL.
 * @param request  Query/mutation document + variables + optional operationName.
 * @param options  Headers, custom fetch implementation, and abort signal.
 * @returns        Typed data `T` from the GraphQL response.
 * @throws         SovereignHttpError    — HTTP 4xx/5xx from the transport layer.
 * @throws         GraphQLRequestError   — `errors` array in the GraphQL response.
 * @throws         TypeError             — Network-level failure (no response).
 *
 * @example With DPoP + withDPoP (all platforms)
 * ```ts
 * import { withDPoP, graphqlWithTrapping } from '@sovereign/secure-client';
 *
 * const TRANSFER_MUTATION = `
 *   mutation Transfer($amount: Int!, $to: ID!) {
 *     transfer(amount: $amount, to: $to) { id status }
 *   }
 * `;
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/graphql',
 *   () => ({ accessToken: authStore.getToken() }),
 *   (proof) => graphqlWithTrapping<{ transfer: TransferResult }>(
 *     'https://api.example.com/graphql',
 *     { query: TRANSFER_MUTATION, variables: { amount: 100, to: 'acc-42' } },
 *     {
 *       headers: {
 *         'Authorization': `DPoP ${authStore.getToken()}`,
 *         'DPoP': proof,
 *       },
 *     },
 *   ).then(data => data.transfer),
 * );
 * await core.execute('transfer-42', executor, { type: 'transfer', amount: 100 });
 * ```
 *
 * @example Without DPoP (standard GraphQL query)
 * ```ts
 * import { graphqlWithTrapping, GraphQLRequestError } from '@sovereign/secure-client/adapters';
 *
 * try {
 *   const data = await graphqlWithTrapping<{ user: User }>(
 *     'https://api.example.com/graphql',
 *     { query: '{ user { id name email } }' },
 *     { headers: { 'Authorization': `Bearer ${token}` } },
 *   );
 *   console.log(data.user);
 * } catch (err) {
 *   if (err instanceof GraphQLRequestError) {
 *     // GQL-level error — display err.errors[0].message to the user
 *   }
 * }
 * ```
 *
 * @example Apollo Client with DPoP headers via context
 * ```ts
 * // When already using Apollo Client, pass DPoP headers via the request context
 * // instead of using graphqlWithTrapping(). withDPoP() still handles proof freshness.
 * import { withDPoP } from '@sovereign/secure-client';
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/graphql',
 *   () => ({ accessToken: authStore.getToken() }),
 *   async (proof) => {
 *     const { data, errors } = await apolloClient.mutate({
 *       mutation: TRANSFER_MUTATION,
 *       variables: payload,
 *       context: {
 *         headers: {
 *           'Authorization': `DPoP ${authStore.getToken()}`,
 *           'DPoP': proof,
 *         },
 *       },
 *     });
 *     if (errors?.length) throw new Error(errors[0]?.message ?? 'GraphQL error');
 *     if (!data) throw new Error('No data returned');
 *     return data.transfer as TransferResult;
 *   },
 * );
 * ```
 *
 * @example Angular with Apollo (via apollo-angular)
 * ```ts
 * import { withDPoP } from '@sovereign/secure-client';
 * import { firstValueFrom } from 'rxjs';
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/graphql',
 *   () => ({ accessToken: this.authService.getToken() }),
 *   async (proof) => {
 *     const result = await firstValueFrom(
 *       this.apollo.mutate<{ transfer: TransferResult }>({
 *         mutation: TRANSFER_MUTATION,
 *         variables: payload,
 *         context: {
 *           headers: {
 *             'Authorization': `DPoP ${this.authService.getToken()}`,
 *             'DPoP': proof,
 *           },
 *         },
 *       })
 *     );
 *     if (result.errors?.length) throw new Error(result.errors[0]?.message);
 *     return result.data!.transfer;
 *   },
 * );
 * ```
 */
export async function graphqlWithTrapping<T>(
  url: string,
  request: GraphQLRequest,
  options: GraphQLRequestOptions = {}
): Promise<T> {
  const { headers = {}, fetchImpl, signal } = options;

  // Resolve the fetch implementation.
  const fetchFn = fetchImpl ?? globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new TypeError(
      '[SovereignCore] graphqlWithTrapping: no fetch implementation available. ' +
      'Pass a fetchImpl option (e.g. node-fetch, cross-fetch) for environments ' +
      'that do not provide a global fetch.'
    );
  }

  // ---------------------------------------------------------------------------
  // 1. HTTP transport: POST the GraphQL request as JSON.
  // ---------------------------------------------------------------------------
  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      query: request.query,
      ...(request.variables !== undefined && { variables: request.variables }),
      ...(request.operationName !== undefined && { operationName: request.operationName }),
    }),
    // RequestInit.signal is AbortSignal | null — convert undefined to null.
    signal: signal ?? null,
  });

  // Non-2xx HTTP response: throw SovereignHttpError so the Error Trapping
  // Matrix can evaluate the status code against its freeze rules.
  if (!response.ok) {
    throw new SovereignHttpError(
      response.status,
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Parse the GraphQL JSON envelope.
  // ---------------------------------------------------------------------------
  const envelope = await response.json() as {
    data?: T;
    errors?: GraphQLErrorShape[];
  };

  // GraphQL-level errors: NOT frozen by the matrix (application-level failures).
  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
    throw new GraphQLRequestError(envelope.errors, envelope.data);
  }

  // Defensive guard: a 200 response with neither data nor errors is malformed.
  if (envelope.data === undefined || envelope.data === null) {
    throw new GraphQLRequestError(
      [{ message: 'GraphQL response contained no data and no errors.' }]
    );
  }

  return envelope.data;
}
