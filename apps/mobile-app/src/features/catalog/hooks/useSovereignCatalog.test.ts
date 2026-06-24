import { renderHook, waitFor } from '@testing-library/react-native';
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
      { id: 1, title: 'Product 1', price: 10, barcode: '111', description: 'desc', category: 'cat', image: 'url' },
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
});
