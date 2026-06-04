/**
 * A single error entry inside a GraphQL `errors` array.
 */
export interface GraphQLErrorShape {
  message: string;
  path?: ReadonlyArray<string | number>;
  locations?: ReadonlyArray<{ line: number; column: number }>;
  extensions?: Record<string, unknown>;
}

/** A standard GraphQL request body (POST). */
export interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

/** Options accepted by graphqlWithTrapping(). */
export interface GraphQLRequestOptions {
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/** Construction options for GraphQLAdapter. */
export interface GraphQLAdapterOptions {
  url: string;
  fetchImpl?: typeof fetch;
}
