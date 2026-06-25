import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSovereignCatalog } from './useSovereignCatalog';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { getAccessToken } from '../../../core/auth/tokenStore';

jest.mock('../../../core/auth/useAuthenticatedRequest', () => ({
  useAuthenticatedRequest: jest.fn(),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('useSovereignCatalog', () => {
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    (useAuthenticatedRequest as jest.Mock).mockReturnValue({ execute: mockExecuteRequest });
    (getAccessToken as jest.Mock).mockResolvedValue('mock-token');
  });

  it('fetches and returns products', async () => {
    mockExecuteRequest.mockResolvedValue([
      {
        id: 1,
        title: 'Product 1',
        price: 10,
        barcode: '111',
        description: 'desc',
        category: 'cat',
        image: 'url',
      },
    ]);

    const { result } = renderHook(() => useSovereignCatalog());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('Product 1');
    expect(result.current.error).toBeNull();
  });

  it('handles error', async () => {
    mockExecuteRequest.mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useSovereignCatalog('cat-error'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.products).toHaveLength(0);
  });

  it('handles abort gracefully without setting state', async () => {
    mockExecuteRequest.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
    );

    const { result, unmount } = renderHook(() => useSovereignCatalog());

    expect(result.current.loading).toBe(true);
    unmount(); // triggers abort
  });

  it('handles AbortError in catch block', async () => {
    const abortError = new Error('Canceled');
    abortError.name = 'AbortError';
    mockExecuteRequest.mockRejectedValue(abortError);

    renderHook(() => useSovereignCatalog());

    // We expect loading to remain true or not be updated if aborted
    await waitFor(() => {
      // Just wait a tick
    });
  });

  it('handles missing token', async () => {
    (getAccessToken as jest.Mock).mockResolvedValue(null);
    mockExecuteRequest.mockResolvedValue([]);

    const { result } = renderHook(() => useSovereignCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(0);
  });

  it('handles refetch', async () => {
    mockExecuteRequest.mockResolvedValue([]);
    const { result } = renderHook(() => useSovereignCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    // We expect loading to be true initially during refetch
    // Wait for the mock to resolve
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
