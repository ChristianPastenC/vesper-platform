import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useCatalog } from './useCatalog';
import { useSovereignCatalog } from './useSovereignCatalog';
import { useIsAuthenticated } from '../../../store/useAppStore';

jest.mock('./useSovereignCatalog', () => ({
  useSovereignCatalog: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useIsAuthenticated: jest.fn(),
}));

describe('useCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to useSovereignCatalog when authenticated', () => {
    (useIsAuthenticated as jest.Mock).mockReturnValue(true);
    const mockSovereignData = {
      products: [{ id: '1', name: 'Real Product', price: 100 }],
      loading: false,
      error: null,
      isEmpty: false,
      refetch: jest.fn(),
    };
    (useSovereignCatalog as jest.Mock).mockReturnValue(mockSovereignData);

    const { result } = renderHook(() => useCatalog());

    expect(result.current.products).toEqual(mockSovereignData.products);
  });

  it('returns mock data when not authenticated', async () => {
    jest.useFakeTimers();
    (useIsAuthenticated as jest.Mock).mockReturnValue(false);
    (useSovereignCatalog as jest.Mock).mockReturnValue({
      products: [],
      loading: true,
      error: null,
      isEmpty: true,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useCatalog());

    expect(result.current.loading).toBe(true);
    expect(result.current.products).toHaveLength(0);

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products[0].name).toBe('Sovereign Hoodie');
    jest.useRealTimers();
  });
});
