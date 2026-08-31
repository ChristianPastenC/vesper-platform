import { useState } from 'react';
import * as Crypto from 'react-native-quick-crypto';
import { useSovereignClient } from '../../../providers/sovereign/SovereignClientContext';
import { SovereignAdapterRequest, encodeJsonBody } from '@vesper-core/ghost-ledger';
import { buildTransactionLedger, TransactionBlock } from '../ledger/buildTransactionLedger';
import { getAccessToken } from '../../../core/auth/tokenStore';

export interface CheckoutResponse {
  success: boolean;
  transactionId: string;
  timestamp: number;
}

export interface CheckoutRequestPayload {
  ledger: TransactionBlock[];
}

export const useSovereignCheckout = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const client = useSovereignClient();

  const executeCheckout = async <T = unknown>(items: T[]): Promise<CheckoutResponse | null> => {
    try {
      setIsProcessing(true);
      setError(null);

      // 1) Build the ledger using buildTransactionLedger
      const ledger = await buildTransactionLedger(items);

      const payload: CheckoutRequestPayload = { ledger };
      const token = await getAccessToken();
      const idempotencyKey = Crypto.randomUUID();

      // 2) Serialize the CheckoutRequest payload with encodeJsonBody
      const encodedBody = encodeJsonBody(payload);

      // 3) Configure the adapter request
      // The DPoP proof is automatically generated because of the client's enableAutoDPoP flag,
      // which is triggered upon detecting "DPoP" within the authorization header.
      const request: SovereignAdapterRequest = {
        method: 'POST',
        url: '/api/v1/checkout/pay',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `DPoP ${token}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: encodedBody,
      };

      const requestId = `checkout-${idempotencyKey}`;

      // 4) Execute the request. In case of a 503/504 or network failure,
      // the SovereignClientCore will automatically sequester the request
      // into the volatile RAM queue due to the shouldFreezeSession logic.
      const response = await client.executeRequest<CheckoutResponse>(requestId, request);

      return response;
    } catch (err: unknown) {
      console.error('[SovereignCheckout] Transaction failed:', err);
      // We only expose the error if it isn't automatically sequestered.
      // Depending on the executeRequest implementation, offline scenarios
      // either trap the promise or throw an explicit offline error.
      const wrappedError = err instanceof Error ? err : new Error('Checkout failed');
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    executeCheckout,
    isProcessing,
    error,
  };
};
