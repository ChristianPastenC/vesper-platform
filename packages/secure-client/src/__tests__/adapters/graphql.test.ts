import { GraphQLAdapter } from '../../adapters/graphql/adapter.js';
import { GraphQLRequestError } from '../../adapters/graphql/error.js';
import { SovereignHttpError } from '../../types.js';

describe('GraphQLAdapter', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
  });

  it('should make successful request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({ data: { user: { id: '1' } } }),
      headers: new Map([['content-type', 'application/json']]),
    });

    const adapter = new GraphQLAdapter({ url: 'https://api.test.com/graphql', fetchImpl: mockFetch });
    const response = await adapter.request<{ user: { id: string } }>({
      method: 'POST',
      url: 'https://api.test.com/graphql',
      headers: { 'X-Custom': '123' }
    });

    expect(response.status).toBe(200);
    expect(response.data?.user.id).toBe('1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1].headers['X-Custom']).toBe('123');
  });

  it('should handle HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const adapter = new GraphQLAdapter({ url: 'https://api.test.com/graphql', fetchImpl: mockFetch });

    await expect(adapter.request({ method: 'POST', url: '' })).rejects.toThrow(SovereignHttpError);
  });

  it('should handle GraphQL errors', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({ errors: [{ message: 'Not found' }] }),
      headers: new Map(),
    });

    const adapter = new GraphQLAdapter({ url: 'https://api.test.com/graphql', fetchImpl: mockFetch });

    await expect(adapter.request({ method: 'POST', url: '' })).rejects.toThrow(GraphQLRequestError);
  });
});
