import { renderHook, act } from '@testing-library/react-native';
import { useProductDetails } from './useProductDetails';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useProductDetails', () => {
  const mockGoBack = jest.fn();
  const mockAddToOnlineCart = jest.fn();
  const mockAddToInStoreCart = jest.fn();

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 99.99,
    barcode: '123456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRoute as jest.Mock).mockReturnValue({
      params: { product: mockProduct },
    });
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
    });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({
        addToOnlineCart: mockAddToOnlineCart,
        addToInStoreCart: mockAddToInStoreCart,
      });
    });
  });

  it('returns product and specifications', () => {
    const { result } = renderHook(() => useProductDetails());

    expect(result.current.product).toEqual(mockProduct);
    expect(result.current.specifications.length).toBeGreaterThan(0);
  });

  it('adds to online cart', () => {
    const { result } = renderHook(() => useProductDetails());

    act(() => {
      result.current.handleAddToOnline();
    });

    expect(mockAddToOnlineCart).toHaveBeenCalledWith({
      id: '1',
      name: 'Test Product',
      price: 99.99,
    });
  });

  it('adds to in-store cart', () => {
    const { result } = renderHook(() => useProductDetails());

    act(() => {
      result.current.handleAddToInStore();
    });

    expect(mockAddToInStoreCart).toHaveBeenCalledWith({
      id: '1',
      barcode: '123456',
      name: 'Test Product',
      price: 99.99,
    });
  });

  it('goes back on handleGoBack', () => {
    const { result } = renderHook(() => useProductDetails());

    act(() => {
      result.current.handleGoBack();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
