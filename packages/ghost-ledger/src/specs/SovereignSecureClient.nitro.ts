import { type HybridObject } from 'react-native-nitro-modules';

export interface QueueStatus {
  size: number;
  isLocked: boolean;
  isIntegrityCompromised: boolean;
}

/**
 * SovereignSecureClient JSI Specification Contract
 * Defines the native boundary for the C++ resilience core.
 */
export interface SovereignSecureClient extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  /**
   * Enqueues a transaction if offline or under network degradation.
   * If online, returns true immediately. If enqueued, returns false.
   */
  executeTransaction(id: string, serializedRequest: ArrayBuffer, ttl: number): boolean;

  /**
   * Retrieves current status of the RAM queue.
   */
  getQueueStatus(): QueueStatus;

  /**
   * Toggles the connection simulation status.
   */
  toggleNetworkSim(online: boolean): void;

  /**
   * Dequeues a specific transaction block and zeroizes its memory.
   */
  dequeueTransaction(id: string): void;

  /**
   * Performs real-time validation of all cryptographic block hashes.
   */
  verifyIntegrity(): boolean;

  /**
   * Purges the queue and zeroizes all blocks.
   */
  clearQueue(): void;

  /**
   * Active zeroization of a single transaction's memory slots.
   */
  zeroize(id: string): void;

  /**
   * Returns a list of pending transaction IDs in FIFO order.
   */
  getQueueIds(): string[];

  /**
   * Retrieves the binary payload of a transaction.
   * Returns null if not found or if the block was zeroized.
   */
  getTransactionPayload(id: string): ArrayBuffer | null;

  /**
   * Encodes a given ArrayBuffer to a Base64Url string in native C++.
   */
  base64UrlEncode(data: ArrayBuffer): string;

  /**
   * Retrieves a snapshot of the telemetry events ring buffer as a binary ArrayBuffer.
   * Each event is packed into 17 bytes (uint8 type, uint64 timestamp, double value).
   */
  getTelemetrySnapshot(): ArrayBuffer;
}
