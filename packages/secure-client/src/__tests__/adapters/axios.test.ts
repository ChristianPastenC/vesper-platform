import { AxiosAdapter } from '../../adapters/axios/adapter.js';
import { SovereignHttpError } from '../../types.js';

describe('AxiosAdapter', () => {
  const mockAxiosInstance = {
    request: jest.fn()
  };

  it('should resolve data on successful axios request', async () => {
    mockAxiosInstance.request.mockResolvedValue({
      status: 200,
      data: { success: true },
      headers: {}
    });

    const adapter = new AxiosAdapter({ axiosInstance: mockAxiosInstance as never });
    const response = await adapter.request({ method: 'POST', url: 'https://test.com' });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });
  });

  it('should rethrow Axios errors as SovereignHttpError', async () => {
    mockAxiosInstance.request.mockResolvedValue({
      status: 500,
      data: 'Error',
      statusText: 'Internal Server Error',
      headers: {}
    });

    const adapter = new AxiosAdapter({ axiosInstance: mockAxiosInstance as never });

    try {
      await adapter.request({ method: 'GET', url: 'https://test.com' });
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SovereignHttpError);
      expect((e as SovereignHttpError).status).toBe(500);
    }
  });
});
