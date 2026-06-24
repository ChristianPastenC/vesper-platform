import { graphqlWithTrapping } from '../../adapters/graphql/functional.js';
import { SovereignHttpError } from '../../types.js';
import { GraphQLRequestError } from '../../adapters/graphql/error.js';

describe('GraphQL Functional Adapter', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
  });

  it('should throw if no fetch provided', async () => {
    const originalFetch = globalThis.fetch;
    delete (globalThis as { fetch?: unknown }).fetch;

    await expect(graphqlWithTrapping('url', { query: 'query' }, {})).rejects.toThrow(/no fetch implementation/);

    globalThis.fetch = originalFetch;
  });

  it('should execute successful request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: { user: { id: '1' } } })
    });

    const result = await graphqlWithTrapping<{ user: { id: string } }>(
      'https://api.com',
      { query: 'query' },
      { fetchImpl: mockFetch }
    );

    expect(result.user.id).toBe('1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle http errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(graphqlWithTrapping('url', { query: 'query' }, { fetchImpl: mockFetch })).rejects.toThrow(SovereignHttpError);
  });

  it('should handle graphql errors array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ errors: [{ message: 'Graphql err' }] })
    });

    await expect(graphqlWithTrapping('url', { query: 'query' }, { fetchImpl: mockFetch })).rejects.toThrow(GraphQLRequestError);
  });

  it('should throw if no data and no errors', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });

    await expect(graphqlWithTrapping('url', { query: 'query' }, { fetchImpl: mockFetch })).rejects.toThrow(GraphQLRequestError);
  });
});
