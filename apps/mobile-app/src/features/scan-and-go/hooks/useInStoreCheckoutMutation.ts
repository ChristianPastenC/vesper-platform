import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../../../store/useAppStore';

interface CheckoutPayload {
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
}

interface CheckoutResponse {
  success: boolean;
  orderId: string;
}

export const useInStoreCheckoutMutation = () => {
  const isOnline = useAppStore((state) => state.isOnline);
  const clearInStoreCart = useAppStore((state) => state.clearInStoreCart);

  const simulateInStoreCheckout = async (
    payload: CheckoutPayload
  ): Promise<CheckoutResponse> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!isOnline) {
          reject(new Error('503 Service Unavailable: No network signal.'));
        } else {
          resolve({
            success: true,
            orderId: 'IS-' + Math.floor(Math.random() * 900000 + 100000),
          });
        }
      }, 1500);
    });
  };

  return useMutation<CheckoutResponse, Error, CheckoutPayload>({
    mutationFn: simulateInStoreCheckout,
    onSuccess: () => {
      clearInStoreCart();
    },
  });
};
