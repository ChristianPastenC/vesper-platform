import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useOnlineCheckoutMutation } from './useOnlineCheckoutMutation';

export const useOnlineCart = () => {
  const { t } = useTranslation();
  const onlineCart = useAppStore((state) => state.onlineCart);
  const getOnlineTotal = useAppStore((state) => state.getOnlineTotal);
  const clearOnlineCart = useAppStore((state) => state.clearOnlineCart);

  const checkoutMutation = useOnlineCheckoutMutation();

  const total = getOnlineTotal();
  const address = t('online_checkout.simulatedAddress');

  const handleCheckout = (onSuccess: (orderId: string) => void) => {
    checkoutMutation.mutate(
      { items: onlineCart, address },
      {
        onSuccess: (data) => {
          onSuccess(data.orderId);
        },
      }
    );
  };

  return {
    cartItems: onlineCart,
    total,
    address,
    clearCart: clearOnlineCart,
    isProcessing: checkoutMutation.isPending,
    handleCheckout,
    t,
  };
};
