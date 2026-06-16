import { renderHook, act } from '@testing-library/react-native';
import { useOnlineCart } from './useOnlineCart';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useOnlineCheckoutMutation } from './useOnlineCheckoutMutation';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('./useOnlineCheckoutMutation', () => ({
  useOnlineCheckoutMutation: jest.fn(),
}));

describe('useOnlineCart', () => {
  const mockClearOnlineCart = jest.fn();
  const mockGetOnlineTotal = jest.fn();
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: (key: string) => key });
    
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        onlineCart: [{ id: '1', name: 'Test', price: 10, quantity: 1 }],
        getOnlineTotal: mockGetOnlineTotal.mockReturnValue(10),
        clearOnlineCart: mockClearOnlineCart,
        isAuthenticated: true,
      };
      return selector(state);
    });

    (useOnlineCheckoutMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('returns cart data', () => {
    const { result } = renderHook(() => useOnlineCart());

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.total).toBe(10);
    expect(result.current.address).toBe('online_checkout.simulatedAddress');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isProcessing).toBe(false);
  });

  it('calls clearCart', () => {
    const { result } = renderHook(() => useOnlineCart());
    act(() => { result.current.clearCart(); });
    expect(mockClearOnlineCart).toHaveBeenCalled();
  });

  it('handles checkout', () => {
    const { result } = renderHook(() => useOnlineCart());
    const mockOnSuccess = jest.fn();

    act(() => {
      result.current.handleCheckout(mockOnSuccess);
    });

    expect(mockMutate).toHaveBeenCalledWith(
      { items: result.current.cartItems, address: 'online_checkout.simulatedAddress' },
      expect.any(Object)
    );

    // simulate onSuccess callback
    const onSuccessCallback = mockMutate.mock.calls[0][1].onSuccess;
    onSuccessCallback({ orderId: '123' });

    expect(mockOnSuccess).toHaveBeenCalledWith('123');
  });
});
