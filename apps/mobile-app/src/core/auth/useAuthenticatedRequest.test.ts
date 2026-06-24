import { renderHook } from '@testing-library/react-native';
import { useAuthenticatedRequest } from './useAuthenticatedRequest';
import { useSovereignClient } from '../../providers/SovereignClientContext';
import { getRefreshToken, saveTokens } from './tokenStore';
import { useAppStore } from '../../store/useAppStore';

jest.mock('../../providers/SovereignClientContext', () => ({
  useSovereignClient: jest.fn(),
}));

jest.mock('./tokenStore', () => ({
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn(),
}));

jest.mock('../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useAuthenticatedRequest', () => {
  const mockExecuteRequest = jest.fn();
  const mockLogout = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (useSovereignClient as jest.Mock).mockReturnValue({ executeRequest: mockExecuteRequest });
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ logout: mockLogout });
    });
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('executes request and returns data if successful', async () => {
    mockExecuteRequest.mockResolvedValue('success-data');
    
    const { result } = renderHook(() => useAuthenticatedRequest());
    
    const response = await result.current.execute('req-1', { method: 'GET', url: '/api/test' });
    
    expect(response).toBe('success-data');
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1);
    expect(mockExecuteRequest).toHaveBeenCalledWith('req-1', { method: 'GET', url: '/api/test' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws original error if status is not 401', async () => {
    const serverError = new Error('Server Error') as any;
    serverError.status = 500;
    mockExecuteRequest.mockRejectedValue(serverError);

    const { result } = renderHook(() => useAuthenticatedRequest());

    await expect(result.current.execute('req-2', { method: 'GET', url: '/api/test' }))
      .rejects.toThrow('Server Error');
      
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('logs out and throws if 401 but no refresh token is found', async () => {
    const authError = new Error('Unauthorized') as any;
    authError.status = 401;
    mockExecuteRequest.mockRejectedValue(authError);
    
    (getRefreshToken as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useAuthenticatedRequest());

    await expect(result.current.execute('req-3', { method: 'GET', url: '/api/test' }))
      .rejects.toThrow('Unauthorized');

    expect(getRefreshToken).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refreshes token, saves it, and retries request on 401', async () => {
    const authError = new Error('Unauthorized') as any;
    authError.status = 401;
    
    // First call fails with 401, second call succeeds
    mockExecuteRequest
      .mockRejectedValueOnce(authError)
      .mockResolvedValueOnce('retry-success-data');
      
    (getRefreshToken as jest.Mock).mockResolvedValue('old-refresh-token');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    });

    const { result } = renderHook(() => useAuthenticatedRequest());

    const response = await result.current.execute('req-4', { 
      method: 'GET', 
      url: '/api/test',
      headers: { 'X-Custom': 'value' } 
    });

    expect(response).toBe('retry-success-data');
    expect(getRefreshToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: 'old-refresh-token' }),
    });
    expect(saveTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
    
    // Expect retry to be called with updated header
    expect(mockExecuteRequest).toHaveBeenCalledTimes(2);
    expect(mockExecuteRequest).toHaveBeenNthCalledWith(2, 'req-4', {
      method: 'GET',
      url: '/api/test',
      headers: {
        'X-Custom': 'value',
        Authorization: 'Bearer new-access-token',
      },
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('logs out and throws if refresh API call fails (e.g. refresh token expired)', async () => {
    const authError = new Error('Unauthorized') as any;
    authError.status = 401;
    mockExecuteRequest.mockRejectedValue(authError);
    
    (getRefreshToken as jest.Mock).mockResolvedValue('invalid-refresh-token');

    // Refresh API fails with 401
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ error: 'Token expired' }),
    });

    const { result } = renderHook(() => useAuthenticatedRequest());

    await expect(result.current.execute('req-5', { method: 'GET', url: '/api/test' }))
      .rejects.toThrow('Token refresh failed');

    expect(mockLogout).toHaveBeenCalled();
    // executeRequest should only be called once because it didn't retry
    expect(mockExecuteRequest).toHaveBeenCalledTimes(1);
  });
});
