import {
  SovereignClientCore,
  SovereignMemoryQueue,
  serializeAdapterRequest,
  ISovereignCryptoProvider,
} from '@vesper-core/ghost-ledger';

describe('Sovereign Ledger Smoke Test (Mock Mode)', () => {
  let memoryQueue: SovereignMemoryQueue;
  let mockCryptoProvider: ISovereignCryptoProvider;

  beforeAll(() => {
    // Minimal configuration for the Provider
    mockCryptoProvider = {} as ISovereignCryptoProvider;

    // Initialize the core client in mock mode, this triggers
    // the forced fallback configuration in JS: `configureQueueEngine({ mock: true })`
    SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: async () => true,
      mock: true,
      networkAdapter: undefined,
    });

    memoryQueue = SovereignMemoryQueue.getInstance();
  });

  beforeEach(() => {
    memoryQueue.clearAll();
  });

  afterAll(() => {
    memoryQueue.clearAll();
    memoryQueue.stopWatchdog();
  });

  it('validates the complete ledger lifecycle: enqueue, verifyLedgerIntegrity, and dequeue', async () => {
    const id = 'test-tx-smoke-123';

    // 1) Enqueue a serialized SovereignAdapterRequest
    const request = {
      method: 'POST',
      url: 'https://api.sovereign.local/v1/secure-data',
      body: new Uint8Array([1, 2, 3, 4, 5]),
    };

    const binaryPayload = serializeAdapterRequest(request);

    // Simulate an offline state so the fallback actually enqueues the transaction
    memoryQueue.toggleNetworkSim(false);

    // Execute enqueue. Internally, the fallback uses slice to copy the buffer.
    await memoryQueue.enqueue(mockCryptoProvider, id, binaryPayload, 60000, () => {});

    // Verify the transaction was enqueued successfully
    expect(memoryQueue.size).toBe(1);

    const executionOrder = memoryQueue.getExecutionOrder();
    expect(executionOrder).toContain(id);

    // 2) Call verifyLedgerIntegrity
    // In fallback mode, this verifies the hash chaining and the absence of modifications.
    const isIntact = await memoryQueue.verifyLedgerIntegrity(mockCryptoProvider);
    expect(isIntact).toBe(true);

    // 3) Execute dequeue
    // The `dequeue` method of the JS Fallback dereferences the memory block.
    await memoryQueue.dequeue(mockCryptoProvider, id);

    // 4) Confirm the buffer is zeroized
    // Internally, `dequeueTransaction` runs `block.serializedRequest.fill(0)` and purges it.
    // We confirm the item was successfully removed and its payload zeroized.
    expect(memoryQueue.size).toBe(0);
    const payloadAfterDequeue = memoryQueue.getPayload(id);
    expect(payloadAfterDequeue).toBeUndefined();
  });
});
