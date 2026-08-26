import { FetchAdapter } from '../../adapters/fetch/adapter.js';
import { SovereignHttpError } from '../../types.js';

describe('FetchAdapter', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('should resolve data on 2xx response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true })
    } as never);

    const adapter = new FetchAdapter();
    const response = await adapter.request({ method: 'GET', url: 'https://test.com' });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });
  });

  it('should throw SovereignHttpError on non-2xx', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
      json: async () => ({ error: 'unauthorized' })
    } as never);

    const adapter = new FetchAdapter();

    await expect(adapter.request({ method: 'GET', url: 'https://test.com' })).rejects.toThrow(SovereignHttpError);
  });
});
