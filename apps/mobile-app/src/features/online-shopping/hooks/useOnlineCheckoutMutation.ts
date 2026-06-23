import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/SovereignClientContext';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { buildTransactionLedger } from '../../payment/ledger/buildTransactionLedger';
import { encodeJsonBody, encodeHeaders } from '@sovereign/secure-client';
import { randomUUID } from 'expo-crypto';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.sovereign.local';

interface CheckoutPayload {
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  address: string;
}

interface CheckoutResponse {
  success: boolean;
  orderId: string;
}

interface SovereignCheckoutResponse {
  transactionId: string;
  status: string;
  receiptHash: string;
}

export const useOnlineCheckoutMutation = () => {
  const clearOnlineCart = useAppStore((state) => state.clearOnlineCart);
  const client = useSovereignClient();

  return useMutation<CheckoutResponse, Error, CheckoutPayload>({
    mutationFn: async (payload: CheckoutPayload) => {
      const token = await getAccessToken();
      const ledger = await buildTransactionLedger(payload.items);
      
      const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const requestBody = {
        total,
        card: { number: '4242424242424242', expMonth: 12, expYear: 2028, cvc: '123' },
        ledger,
      };

      const bodyBytes = encodeJsonBody(requestBody);
      const idempotencyKey = randomUUID();

      const headers = encodeHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      });

      const response = await client.executeRequest<SovereignCheckoutResponse>(randomUUID(), {
        method: 'POST',
        url: `${API_URL}/api/v1/checkout/online`,
        headers,
        body: bodyBytes,
      });

      return {
        success: response.status === 'success' || !!response.transactionId,
        orderId: response.transactionId,
      };
    },
    onSuccess: () => {
      clearOnlineCart();
    },
  });
};
