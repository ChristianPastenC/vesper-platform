import { useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getNativeClient } from '../../../../../../packages/secure-client/src/ledger/queue';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';

/**
 * usePaymentClearing Hook
 * Subscribes to network events and triggers batch processing (Eventual Consistency)
 * for transactions held in RAM when connectivity is restored.
 */
export const usePaymentClearing = () => {
  const isProcessing = useRef(false);
  const { execute } = useAuthenticatedRequest();

  const processQueue = useCallback(async () => {
    // Re-entrancy lock to prevent fast network toggles (signal flapping) from triggering parallel processing
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      const client = getNativeClient();
      const queueIds = client.getQueueIds();

      if (queueIds.length === 0) {
        isProcessing.current = false;
        return;
      }

      console.log(
        `[PaymentClearing] Network restored. Processing ${queueIds.length} in-memory transactions...`,
      );

      const batch = [];
      const validIds = [];

      for (const id of queueIds) {
        // Read binary payload from C++ memory
        const payload = client.getTransactionPayload(id);

        if (!payload) {
          console.warn(
            `[PaymentClearing] Payload for transaction ${id} not found or already zeroized.`,
          );
          continue;
        }

        // Encode binary buffer to securely transmit it to the backend for verification
        const base64Payload = client.base64UrlEncode(payload);
        batch.push({ transactionId: id, payload: base64Payload });
        validIds.push(id);
      }

      if (batch.length > 0) {
        try {
          await execute('sync-offline-payments', {
            method: 'POST',
            path: '/api/v1/checkout/sync',
            body: { transactions: batch },
          });

          console.log(
            `[PaymentClearing] Batch of ${batch.length} transactions processed successfully. Dequeuing (zeroizing)...`,
          );

          // Release and destroy RAM buffer for all successfully sent transactions
          for (const id of validIds) {
            client.dequeueTransaction(id);
          }
        } catch (error) {
          console.error(`[PaymentClearing] Network error while processing batch:`, error);
        }
      }
    } catch (error) {
      console.error(
        '[PaymentClearing] Critical error while accessing SovereignSecureClient:',
        error,
      );
    } finally {
      isProcessing.current = false;
    }
  }, [execute]);

  useEffect(() => {
    // Actively listen to network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        processQueue();
      }
    });

    return () => unsubscribe();
  }, [processQueue]);

  return { processQueue };
};
