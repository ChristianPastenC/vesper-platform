import { renderHook, waitFor } from '@testing-library/react-native';
import { useSovereignCatalog } from './useSovereignCatalog';
import { useSovereignClient } from '../../../providers/SovereignClientContext';
import { getAccessToken } from '../../../core/auth/tokenStore';

jest.mock('../../../providers/SovereignClientContext', () => ({
  useSovereignClient: jest.fn(),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  getAccessToken: jest.fn(),
}));

describe('useSovereignCatalog', () => {
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    (useSovereignClient as jest.Mock).mockReturnValue({ executeRequest: mockExecuteRequest });
    (getAccessToken as jest.Mock).mockResolvedValue('mock-token');
  });

  it('fetches and returns products', async () => {
    mockExecuteRequest.mockResolvedValue([
      { id: '1', name: 'Product 1', price: 10, barcode: '111' },
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

  it('handles nested data structures', async () => {
    mockExecuteRequest.mockResolvedValue({
      data: [{ id: '2', name: 'Product 2', price: 20, barcode: '222' }]
    });

    const { result } = renderHook(() => useSovereignCatalog('cat-2', 20));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('Product 2');
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
