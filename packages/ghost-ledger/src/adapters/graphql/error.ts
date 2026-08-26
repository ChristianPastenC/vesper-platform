import type { GraphQLErrorShape } from './types.js';

/**
 * Thrown when the GraphQL server returns an `errors` array in its response.
 *
 * GraphQL-level errors mean the request REACHED the server and was processed —
 * they are application-level failures (validation, resolver errors, permissions)
 * and MUST NOT be frozen by the Error Trapping Matrix.
 */
export class GraphQLRequestError extends Error {
  public readonly errors: ReadonlyArray<GraphQLErrorShape>;
  public readonly partialData: unknown;

  constructor(errors: GraphQLErrorShape[], partialData?: unknown) {
    super(errors.map((e) => e.message).join(' | '));
    this.name = 'GraphQLRequestError';
    this.errors = errors;
    this.partialData = partialData;
    Object.setPrototypeOf(this, GraphQLRequestError.prototype);
  }
}
