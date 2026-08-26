import { renderHook } from '@testing-library/react-native';
import { useCatalog } from './useCatalog';
import { useSovereignCatalog } from './useSovereignCatalog';

jest.mock('./useSovereignCatalog', () => ({
  useSovereignCatalog: jest.fn(),
}));

describe('useCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to useSovereignCatalog unconditionally', () => {
    const mockSovereignData = {
      products: [{ id: '1', name: 'Real Product', price: 100 }],
      loading: false,
      error: null,
      isEmpty: false,
      refetch: jest.fn(),
    };
    (useSovereignCatalog as jest.Mock).mockReturnValue(mockSovereignData);

    const { result } = renderHook(() => useCatalog('electronics', 15));

    expect(useSovereignCatalog).toHaveBeenCalledWith('electronics', 15);
    expect(result.current.products).toEqual(mockSovereignData.products);
  });
});
