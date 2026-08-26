import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { buildTransactionLedger } from '../../payment/ledger/buildTransactionLedger';
import { encodeJsonBody, encodeHeaders } from '@vesper/ghost-ledger';
import { randomUUID } from 'react-native-quick-crypto';
import { getApiUrl } from '../../../core/config';

interface CheckoutPayload {
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
}

interface CheckoutResponse {
  success: boolean;
  orderId: string;
  isQueued?: boolean;
}

interface SovereignCheckoutResponse {
  transactionId: string;
  status: string;
  receiptHash: string;
  isFrozen?: boolean;
}

export const useInStoreCheckoutMutation = () => {
  const clearInStoreCart = useAppStore((state) => state.clearInStoreCart);
  const { execute } = useAuthenticatedRequest();

  return useMutation<CheckoutResponse, Error, CheckoutPayload>({
    mutationFn: async (payload: CheckoutPayload) => {
      const API_URL = getApiUrl();
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

      const response = await execute<SovereignCheckoutResponse>(randomUUID(), {
        method: 'POST',
        url: `${API_URL}/api/v1/checkout/instore`,
        encodedHeaders: headers,
        body: bodyBytes,
      });

      return {
        success: response.status === 'success' || !!response.transactionId,
        orderId: response.transactionId,
        isQueued: response.isFrozen,
      };
    },
    onSuccess: (data) => {
      if (!data.isQueued) {
        clearInStoreCart();
      }
    },
  });
};
