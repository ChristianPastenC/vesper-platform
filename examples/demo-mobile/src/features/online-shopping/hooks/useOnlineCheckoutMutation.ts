import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { buildTransactionLedger } from '../../payment/ledger/buildTransactionLedger';
import { encodeJsonBody, encodeHeaders } from '@vesper-core/ghost-ledger';
import { randomUUID } from 'react-native-quick-crypto';
import { getApiUrl, getTestCardNumber } from '../../../core/config';

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
  const { execute } = useAuthenticatedRequest();

  return useMutation<CheckoutResponse, Error, CheckoutPayload>({
    mutationFn: async (payload: CheckoutPayload) => {
      const API_URL = getApiUrl();
      const token = await getAccessToken();
      const ledger = await buildTransactionLedger(payload.items);

      const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const requestBody = {
        total,
        items: payload.items,
        card: { number: getTestCardNumber(), expMonth: 12, expYear: 2028, cvc: '123' },
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
        url: `${API_URL}/api/v1/checkout/online`,
        encodedHeaders: headers,
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
