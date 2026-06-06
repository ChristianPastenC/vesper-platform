import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useInStoreCheckoutMutation } from './useInStoreCheckoutMutation';

export const useInStoreCheckout = () => {
  const { t } = useTranslation();
  const inStoreCart = useAppStore((state) => state.inStoreCart);
  const getInStoreTotal = useAppStore((state) => state.getInStoreTotal);
  const clearInStoreCart = useAppStore((state) => state.clearInStoreCart);
  const isOnline = useAppStore((state) => state.isOnline);
  const toggleNetwork = useAppStore((state) => state.toggleNetwork);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const checkoutMutation = useInStoreCheckoutMutation();

  const total = getInStoreTotal();

  const handleCheckout = (onSuccess: (orderId: string) => void) => {
    checkoutMutation.mutate(
      { items: inStoreCart },
      {
        onSuccess: (data) => {
          onSuccess(data.orderId);
        },
      }
    );
  };

  return {
    cartItems: inStoreCart,
    total,
    isOnline,
    toggleNetwork,
    isProcessing: checkoutMutation.isPending,
    error: checkoutMutation.error,
    clearCart: clearInStoreCart,
    handleCheckout,
    isAuthenticated,
    t,
  };
};
