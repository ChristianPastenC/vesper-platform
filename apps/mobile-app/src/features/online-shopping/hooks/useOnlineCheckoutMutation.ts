import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../../../store/useAppStore';

interface CheckoutPayload {
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  address: string;
}

interface CheckoutResponse {
  success: boolean;
  orderId: string;
}

const simulateOnlineCheckout = async (_payload: CheckoutPayload): Promise<CheckoutResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        orderId: 'ON-' + Math.floor(Math.random() * 900000 + 100000),
      });
    }, 1500);
  });
};

export const useOnlineCheckoutMutation = () => {
  const clearOnlineCart = useAppStore((state) => state.clearOnlineCart);

  return useMutation<CheckoutResponse, Error, CheckoutPayload>({
    mutationFn: simulateOnlineCheckout,
    onSuccess: () => {
      clearOnlineCart();
    },
  });
};
