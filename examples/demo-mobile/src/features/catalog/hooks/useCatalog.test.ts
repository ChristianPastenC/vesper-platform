import { renderHook } from '@testing-library/react-native';
import { useCatalog } from './useCatalog';
import { useVesperCatalog } from './useVesperCatalog';

jest.mock('./useVesperCatalog', () => ({
  useVesperCatalog: jest.fn(),
}));

describe('useCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to useVesperCatalog unconditionally', () => {
    const mockVesperData = {
      products: [{ id: '1', name: 'Real Product', price: 100 }],
      loading: false,
      error: null,
      isEmpty: false,
      refetch: jest.fn(),
    };
    (useVesperCatalog as jest.Mock).mockReturnValue(mockVesperData);

    const { result } = renderHook(() => useCatalog('electronics', 15));

    expect(useVesperCatalog).toHaveBeenCalledWith('electronics', 15);
    expect(result.current.products).toEqual(mockVesperData.products);
  });
});
