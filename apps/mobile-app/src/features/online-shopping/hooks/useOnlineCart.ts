import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useOnlineCheckoutMutation } from './useOnlineCheckoutMutation';

export const useOnlineCart = () => {
  const { t } = useTranslation();
  const onlineCart = useAppStore((state) => state.onlineCart);
  const getOnlineTotal = useAppStore((state) => state.getOnlineTotal);
  const clearOnlineCart = useAppStore((state) => state.clearOnlineCart);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const checkoutMutation = useOnlineCheckoutMutation();

  const deliveryAddress = useAppStore((state) => state.deliveryAddress);
  const setDeliveryAddress = useAppStore((state) => state.setDeliveryAddress);

  const total = getOnlineTotal();
  const address = deliveryAddress || '';

  const handleCheckout = (onSuccess: (orderId: string) => void) => {
    checkoutMutation.mutate(
      { items: onlineCart, address },
      {
        onSuccess: (data) => {
          onSuccess(data.orderId);
        },
      },
    );
  };

  return {
    cartItems: onlineCart,
    total,
    address,
    setAddress: setDeliveryAddress,
    clearCart: clearOnlineCart,
    isProcessing: checkoutMutation.isPending,
    handleCheckout,
    isAuthenticated,
    t,
  };
};
