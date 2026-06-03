/**
 * @sovereign/secure-client/adapters — transport adapter utilities
 *
 * Platform-agnostic adapters that bridge your HTTP transport layer with
 * the SovereignClientCore Error Trapping Matrix.
 *
 * Import from this subpath for tree-shaking in bundle-size sensitive apps:
 *
 *   import { fetchWithTrapping }    from '@sovereign/secure-client/adapters';
 *   import { axiosWithTrapping }    from '@sovereign/secure-client/adapters';
 *   import { graphqlWithTrapping }  from '@sovereign/secure-client/adapters';
 *
 * Or import everything from the main entry point:
 *
 *   import { fetchWithTrapping, axiosWithTrapping, graphqlWithTrapping }
 *     from '@sovereign/secure-client';
 */

// fetch adapter
export type { FetchWithTrappingOptions }                  from './fetch.js';
export { fetchWithTrapping }                              from './fetch.js';

// Axios adapter (no hard axios dependency — uses duck-typed interfaces)
export type { AxiosInstance, AxiosCompatRequestConfig, AxiosCompatResponse } from './axios.js';
export { axiosWithTrapping }                              from './axios.js';

// GraphQL adapter (framework-agnostic, no Apollo/urql dependency)
export type { GraphQLRequest, GraphQLRequestOptions, GraphQLErrorShape } from './graphql.js';
export { GraphQLRequestError, graphqlWithTrapping }       from './graphql.js';
