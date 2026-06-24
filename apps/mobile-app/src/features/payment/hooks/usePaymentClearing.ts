import { useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getNativeClient } from '../../../../../../packages/secure-client/src/ledger/queue';

/**
 * usePaymentClearing Hook
 * Subscribes to network events and triggers batch processing (Eventual Consistency)
 * for transactions held in RAM when connectivity is restored.
 */
export const usePaymentClearing = () => {
  const isProcessing = useRef(false);

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

      console.log(`[PaymentClearing] Network restored. Processing ${queueIds.length} in-memory transactions...`);

      for (const id of queueIds) {
        // Read binary payload from C++ memory
        const payload = client.getTransactionPayload(id);
        
        if (!payload) {
          console.warn(`[PaymentClearing] Payload for transaction ${id} not found or already zeroized.`);
          continue;
        }

        try {
          // Encode binary buffer to securely transmit it to the backend for verification
          const base64Payload = client.base64UrlEncode(payload);
          
          const response = await fetch('https://api.sovereigncore.internal/v1/checkout/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transactionId: id, payload: base64Payload }),
          });

          if (response.ok) {
            console.log(`[PaymentClearing] Transaction ${id} processed successfully. Dequeuing (zeroizing)...`);
            // Release and destroy RAM buffer
            client.dequeueTransaction(id);
          } else {
            console.error(`[PaymentClearing] Failed to sync ${id}: HTTP ${response.status}`);
            // On an HTTP failure (e.g. 500) we stop the loop to avoid spamming and preserve FIFO ordering
            break;
          }
        } catch (error) {
          console.error(`[PaymentClearing] Network error while processing ${id}:`, error);
          // Recurring network failure: safely break the loop
          break;
        }
      }
    } catch (error) {
      console.error('[PaymentClearing] Critical error while accessing SovereignSecureClient:', error);
    } finally {
      isProcessing.current = false;
    }
  }, []);

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
