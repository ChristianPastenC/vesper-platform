import * as Crypto from 'expo-crypto';

export interface TransactionBlock {
  index: number;
  timestamp: number;
  payload: string;
  precedingHash: string;
  hash: string;
}

/**
 * Builds a sequential transaction ledger from a list of cart items.
 * Each block's hash depends on its payload, the preceding block's hash, and its timestamp.
 * 
 * @param items Array of cart items (OnlineCartItem, InStoreCartItem, or generic items).
 * @returns Array of linked TransactionBlock objects.
 */
export const buildTransactionLedger = async <T = unknown>(
  items: T[]
): Promise<TransactionBlock[]> => {
  const ledger: TransactionBlock[] = [];
  let precedingHash = '0'; // Genesis block precedes with "0"

  for (let i = 0; i < items.length; i++) {
    const timestamp = Date.now();
    const payload = JSON.stringify(items[i]);
    
    // Concatenate payload, precedingHash, and timestamp to generate the hash
    const dataToHash = `${payload}${precedingHash}${timestamp}`;
    
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToHash
    );

    const block: TransactionBlock = {
      index: i,
      timestamp,
      payload,
      precedingHash,
      hash,
    };

    ledger.push(block);
    precedingHash = hash;
  }

  return ledger;
};
