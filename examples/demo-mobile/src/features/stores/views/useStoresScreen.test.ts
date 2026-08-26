import { renderHook, act } from '@testing-library/react-native';
import { useStoresScreen } from './useStoresScreen';
import { useStores } from '../hooks/useStores';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

jest.mock('../hooks/useStores', () => ({
  useStores: jest.fn(),
}));

describe('useStoresScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return stores, isLoading, error and handleRoutePress', () => {
    (useStores as jest.Mock).mockReturnValue({
      stores: [{ id: '1', name: 'Store 1' }],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStoresScreen());

    expect(result.current.stores).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    act(() => {
      result.current.handleRoutePress('1');
    });

    expect(console.log).toHaveBeenCalledWith('Route to store', '1');
  });
});
