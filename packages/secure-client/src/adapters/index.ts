/**
 * @sovereign/secure-client/adapters — transport adapter utilities
 *
 * Platform-agnostic adapters that bridge your HTTP transport layer with
 * the SovereignClientCore Error Trapping Matrix.
 *
 * Two usage patterns are supported:
 *
 *   Functional (stateless utilities):
 *     import { fetchWithTrapping, axiosWithTrapping, graphqlWithTrapping }
 *       from '@sovereign/secure-client/adapters';
 *
 *   Object-oriented (ISovereignNetworkAdapter implementations, DI-compatible):
 *     import { FetchAdapter, AxiosAdapter, GraphQLAdapter }
 *       from '@sovereign/secure-client/adapters';
 */

// ---------------------------------------------------------------------------
// fetch adapter
// ---------------------------------------------------------------------------
export type { FetchWithTrappingOptions, FetchAdapterOptions } from './fetch.js';
export { fetchWithTrapping, FetchAdapter } from './fetch.js';

// ---------------------------------------------------------------------------
// Axios adapter (no hard axios dependency — uses duck-typed interfaces)
// ---------------------------------------------------------------------------
export type {
  AxiosInstance,
  AxiosCompatRequestConfig,
  AxiosCompatResponse,
  AxiosAdapterOptions,
} from './axios.js';
export { axiosWithTrapping, AxiosAdapter } from './axios.js';

// ---------------------------------------------------------------------------
// GraphQL adapter (framework-agnostic, no Apollo/urql dependency)
// ---------------------------------------------------------------------------
export type {
  GraphQLRequest,
  GraphQLRequestOptions,
  GraphQLErrorShape,
  GraphQLAdapterOptions,
} from './graphql.js';
export { GraphQLRequestError, graphqlWithTrapping, GraphQLAdapter } from './graphql.js';
