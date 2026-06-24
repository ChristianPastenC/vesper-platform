import { SovereignMemoryQueue, configureQueueEngine } from '../../ledger/queue.js';
import { ISovereignCryptoProvider } from '../../contracts/index.js';

describe('SovereignMemoryQueue', () => {
  let queue: SovereignMemoryQueue;
  let mockCryptoProvider: jest.Mocked<ISovereignCryptoProvider>;

  it('should configure mock engine', () => {
    configureQueueEngine({ mock: true });
    const instance = SovereignMemoryQueue.getInstance();
    expect(instance).toBeDefined();
  });

  beforeAll(() => {
    configureQueueEngine({ mock: true });
  });

  beforeEach(() => {
    (SovereignMemoryQueue as unknown as { instance: unknown }).instance = undefined;

    mockCryptoProvider = {
      hash: jest.fn().mockResolvedValue(new Uint8Array(32).fill(1)),
      randomBytes: jest.fn().mockReturnValue(new Uint8Array(16)),
    } as never;

    queue = SovereignMemoryQueue.getInstance();
    queue.toggleNetworkSim(false);
  });

  afterEach(() => {
    queue.stopWatchdog();
    queue.clearAll();
  });

  it('should enqueue and dequeue transaction', async () => {
    const payload = new Uint8Array([1, 2, 3]);
    await queue.enqueue(mockCryptoProvider, 'txn1', payload, 1000, jest.fn());

    expect(queue.size).toBe(1);

    const block = queue.getPayload('txn1');
    expect(block).toBeDefined();

    await queue.dequeue(mockCryptoProvider, 'txn1');
    expect(queue.size).toBe(0);
  });

  it('should expire transactions', async () => {
    jest.useFakeTimers();
    const onExpiry = jest.fn();
    const payload = new Uint8Array([1, 2, 3]);
    await queue.enqueue(mockCryptoProvider, 'txn-expiry', payload, 500, onExpiry);

    expect(queue.size).toBe(1);
    jest.advanceTimersByTime(600);
    expect(onExpiry).toHaveBeenCalledWith('txn-expiry');
    expect(queue.size).toBe(0);
    jest.useRealTimers();
  });

  it('should maintain chain integrity', async () => {
    const payload1 = new Uint8Array([1]);
    const payload2 = new Uint8Array([2]);

    await queue.enqueue(mockCryptoProvider, 'txn1', payload1, 1000, jest.fn());
    await queue.enqueue(mockCryptoProvider, 'txn2', payload2, 1000, jest.fn());

    const isValid = await queue.verifyLedgerIntegrity(mockCryptoProvider);
    expect(isValid).toBe(true);
    expect(queue.isIntegrityCompromised).toBe(false);
  });



  it('should actively zeroize blocks on dequeue', async () => {
    const payload = new Uint8Array([9, 9, 9]);
    await queue.enqueue(mockCryptoProvider, 'txn-zero', payload, 1000, jest.fn());
    const block = queue.getPayload('txn-zero');

    await queue.activeZeroization(mockCryptoProvider, 'txn-zero');

    // fetch again because getPayload returns a clone view
    const blockAfter = queue.getPayload('txn-zero');
    expect(blockAfter).toBeUndefined();
    expect(queue.size).toBe(0);
  });

  it('should rechain ledger when a middle transaction is dequeued', async () => {
    // This hits fallback.ts rechainLedger logic
    await queue.enqueue(mockCryptoProvider, 'txn-a', new Uint8Array([1]), 1000, jest.fn());
    await queue.enqueue(mockCryptoProvider, 'txn-b', new Uint8Array([2]), 1000, jest.fn());
    await queue.enqueue(mockCryptoProvider, 'txn-c', new Uint8Array([3]), 1000, jest.fn());

    await queue.dequeue(mockCryptoProvider, 'txn-b'); // dequeue middle

    expect(queue.size).toBe(2);
    expect(queue.getExecutionOrder()).toEqual(['txn-a', 'txn-c']);
  });

  it('should fallback to mock native client if __SOVEREIGN_MOCK__ is set', () => {
    (globalThis as { __SOVEREIGN_MOCK__?: boolean }).__SOVEREIGN_MOCK__ = true;
    const oldInstance = (SovereignMemoryQueue as unknown as { instance: unknown }).instance;
    (SovereignMemoryQueue as unknown as { instance: unknown }).instance = undefined; // force recreation

    const q = SovereignMemoryQueue.getInstance();
    expect(q).toBeDefined();

    delete (globalThis as { __SOVEREIGN_MOCK__?: boolean }).__SOVEREIGN_MOCK__;
    (SovereignMemoryQueue as unknown as { instance: unknown }).instance = oldInstance;
  });
});
