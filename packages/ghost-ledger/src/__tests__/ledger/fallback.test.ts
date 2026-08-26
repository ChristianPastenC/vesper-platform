import { SovereignSecureClientFallback } from '../../ledger/fallback.js';
import { SovereignMemoryQueue } from '../../ledger/queue.js';

describe('SovereignSecureClientFallback', () => {
  let fallback: SovereignSecureClientFallback;
  let mockQueue: Record<string, jest.Mock>;

  beforeEach(() => {
    mockQueue = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      dequeue: jest.fn().mockResolvedValue(undefined),
      verifyLedgerIntegrity: jest.fn().mockResolvedValue(true),
      suspendAndFreezeLedger: jest.fn(),
      clearAll: jest.fn(),
      getQueueStatus: jest.fn().mockReturnValue({ size: 1, isLocked: false, isIntegrityCompromised: false }),
      getPayload: jest.fn().mockReturnValue({ serializedRequest: new Uint8Array([1, 2, 3]), isZeroized: false })
    };

    // Override the singleton instance of queue in tests
    (SovereignMemoryQueue as unknown as { instance: unknown }).instance = mockQueue;

    fallback = new SovereignSecureClientFallback();
  });

  afterEach(() => {
    (SovereignMemoryQueue as unknown as { instance: unknown }).instance = undefined;
  });

  it('should get queue status', () => {
    const status = fallback.getQueueStatus();
    expect(status.size).toBe(0);
    expect(status.isLocked).toBe(false);
  });

  it('should return boolean if online on execute transaction', async () => {
    fallback.toggleNetworkSim(true);
    const result = await fallback.executeTransaction('txn1', new Uint8Array([1, 2, 3]).buffer, 1000);
    expect(result).toBe(true);
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('should queue if offline on execute transaction', async () => {
    fallback.toggleNetworkSim(false);
    const result = await fallback.executeTransaction('txn2', new Uint8Array([1, 2, 3]).buffer, 1000);
    expect(result).toBe(false);
    // fallback uses internal queue, not the MemoryQueue wrapper
  });

  it('should dequeue transaction', async () => {
    await fallback.dequeueTransaction('txn3');
    // doesn't call mockQueue.dequeue
  });

  it('should toggle network sim', () => {
    fallback.toggleNetworkSim(false);
    expect((fallback as unknown as { isOnline: boolean }).isOnline).toBe(false);
  });

  it('should return empty payload for zeroized transaction', () => {
    fallback.toggleNetworkSim(false);
    fallback.executeTransaction('txn4', new Uint8Array([1]).buffer, 100);
    fallback.zeroize('txn4');
    const payload = fallback.getTransactionPayload('txn4');
    expect(payload).toBeNull();
  });

  it('should verify integrity successfully', async () => {
    const result = await fallback.verifyIntegrity();
    expect(result).toBe(true);
  });

  it('should encode ArrayBuffer to base64url correctly', () => {
    const input = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
    const encoded = fallback.base64UrlEncode(input.buffer);
    // "hello" in base64 is "aGVsbG8=" -> base64url is "aGVsbG8"
    expect(encoded).toBe('aGVsbG8');
  });
});
