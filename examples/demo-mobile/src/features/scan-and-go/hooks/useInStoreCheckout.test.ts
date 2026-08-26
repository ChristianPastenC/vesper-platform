import { renderHook, act } from '@testing-library/react-native';
import { useInStoreCheckout } from './useInStoreCheckout';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useInStoreCheckoutMutation } from './useInStoreCheckoutMutation';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('./useInStoreCheckoutMutation', () => ({
  useInStoreCheckoutMutation: jest.fn(),
}));

describe('useInStoreCheckout', () => {
  const mockClearInStoreCart = jest.fn();
  const mockGetInStoreTotal = jest.fn();
  const mockMutate = jest.fn();
  const mockToggleNetwork = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: (key: string) => key });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        inStoreCart: [{ id: '1', name: 'Test', price: 10, quantity: 1 }],
        getInStoreTotal: mockGetInStoreTotal.mockReturnValue(10),
        clearInStoreCart: mockClearInStoreCart,
        isAuthenticated: true,
        isOnline: true,
        toggleNetwork: mockToggleNetwork,
      };
      return selector(state);
    });

    (useInStoreCheckoutMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });
  });

  it('returns cart data', () => {
    const { result } = renderHook(() => useInStoreCheckout());

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.total).toBe(10);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isProcessing).toBe(false);
  });

  it('calls clearCart', () => {
    const { result } = renderHook(() => useInStoreCheckout());
    act(() => {
      result.current.clearCart();
    });
    expect(mockClearInStoreCart).toHaveBeenCalled();
  });

  it('handles checkout', () => {
    const { result } = renderHook(() => useInStoreCheckout());
    const mockOnSuccess = jest.fn();

    act(() => {
      result.current.handleCheckout(mockOnSuccess);
    });

    expect(mockMutate).toHaveBeenCalledWith(
      { items: result.current.cartItems },
      expect.any(Object),
    );

    // simulate onSuccess callback
    const onSuccessCallback = mockMutate.mock.calls[0][1].onSuccess;
    onSuccessCallback({ orderId: '123' });

    expect(mockOnSuccess).toHaveBeenCalledWith('123');
  });
});
