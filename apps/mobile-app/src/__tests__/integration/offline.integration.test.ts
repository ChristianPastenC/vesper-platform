import { SovereignMemoryQueue, SovereignClientCore, serializeAdapterRequest } from '@sovereign/secure-client';

describe('Integration: Offline Queue', () => {
  let queue: SovereignMemoryQueue;
  let client: SovereignClientCore;

  beforeEach(() => {
    (globalThis as any).__SOVEREIGN_MOCK__ = true;
    queue = SovereignMemoryQueue.getInstance();
    queue.clearAll();

    client = SovereignClientCore.getInstance({
      mock: true,
      cryptoProvider: {
        sha256: jest.fn(),
        randomBytes: jest.fn(),
        exportKey: jest.fn(),
        importKey: jest.fn(),
        encryptAesGcm: jest.fn(),
        decryptAesGcm: jest.fn(),
        wrapKeyRsaOaep: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      networkResolver: async () => true,
      networkAdapter: { request: jest.fn().mockResolvedValue({ status: 200, data: {} }) },
      errorTrapping: { enabled: false }
    });
  });

  it('queues request offline and replays when online', async () => {
    // Simulate disconnection
    queue.toggleNetworkSim(false);

    const request = {
      method: 'POST',
      url: 'https://api.test/sync',
      headers: {},
      body: new Uint8Array([1, 2, 3])
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cryptoMock = (client as any).cryptoProvider;
    
    // Enqueue a serialized SovereignAdapterRequest
    const binaryReq = serializeAdapterRequest(request);
    await queue.enqueue(
      cryptoMock,
      'test-req-1',
      binaryReq,
      60000,
      jest.fn()
    );

    // Verify queue size is 1
    expect(queue.size).toBe(1);

    // Call toggleNetworkSim(true)
    queue.toggleNetworkSim(true);
    
    // Call processSynchronizedQueue(mockHandshake)
    const mockHandshake = jest.fn().mockResolvedValue(true);
    await client.processSynchronizedQueue(mockHandshake);

    // Verify queue size is 0 after replay
    expect(queue.size).toBe(0);
  });
});
