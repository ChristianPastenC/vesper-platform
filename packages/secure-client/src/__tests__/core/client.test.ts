import { SovereignClientCore } from '../../core/client.js';
import { ISovereignCryptoProvider, ISovereignNetworkAdapter } from '../../contracts/index.js';
import { SovereignMemoryQueue } from '../../ledger/queue.js';
import { IntegrityBreachError } from '../../types.js';

describe('SovereignClientCore', () => {
  let mockCryptoProvider: jest.Mocked<ISovereignCryptoProvider>;
  let mockNetworkAdapter: jest.Mocked<ISovereignNetworkAdapter>;
  let mockNetworkResolver: jest.Mock<Promise<boolean>, []>;

  beforeEach(() => {
    (SovereignClientCore as unknown as { instance: unknown }).instance = undefined;
    (SovereignMemoryQueue as unknown as { instance: unknown }).instance = undefined;

    mockCryptoProvider = {
      hash: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      randomBytes: jest.fn().mockReturnValue(new Uint8Array(16)),
      subtle: {
        generateKey: jest.fn().mockResolvedValue({
          publicKey: {} as CryptoKey,
          privateKey: {} as CryptoKey,
        }),
        exportKey: jest.fn().mockResolvedValue({
          kty: 'EC',
          crv: 'P-256',
          x: 'xxx',
          y: 'yyy'
        }),
        sign: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
      } as never,
    } as never;

    mockNetworkAdapter = {
      request: jest.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} }),
    } as never;

    mockNetworkResolver = jest.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
    SovereignMemoryQueue.getInstance().stopWatchdog();
    SovereignMemoryQueue.getInstance().clearAll();
  });

  it('should initialize successfully', () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    expect(client).toBeDefined();
    expect(client.isFrozen).toBe(false);
    expect(client.isIntegrityCompromised).toBe(false);
  });

  it('should execute request when online', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    mockNetworkAdapter.request.mockResolvedValue({ data: 'success', status: 200, statusText: 'OK', headers: {} });

    const result = await client.executeRequest('req-1', {
      method: 'GET',
      url: 'https://api.test.com'
    });

    expect(result).toBe('success');
    expect(mockNetworkAdapter.request).toHaveBeenCalledTimes(1);
  });

  it('should queue request when offline', async () => {
    mockNetworkResolver.mockResolvedValue(false);

    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    let caughtError: unknown;
    client.executeRequest('req-2', {
      method: 'GET',
      url: 'https://api.test.com'
    }).catch((e: unknown) => caughtError = e);

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(client.isFrozen).toBe(true);
    client.purgeAll();

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(caughtError).toBeDefined();
    expect((caughtError as Error).message).toMatch(/Session purged/);
  });

  it('should trap errors and freeze', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true,
      errorTrapping: {
        freezeOn503_504: true
      }
    });

    mockNetworkAdapter.request.mockRejectedValue({ status: 503 });

    let caughtError: unknown;
    client.executeRequest('req-3', {
      method: 'GET',
      url: 'https://api.test.com'
    }).catch((e: unknown) => caughtError = e);

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(client.isFrozen).toBe(true);
    client.purgeAll();

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(caughtError).toBeDefined();
  });

  it('should process queue and reject if handshake fails', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    await expect(client.processSynchronizedQueue(async () => false)).rejects.toThrow(/Handshake failed/);
  });

  it.skip('should process queue and resolve pending requests', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    // Make it offline
    mockNetworkResolver.mockResolvedValue(false);
    let resolvedData: unknown;
    let caughtError: Error | undefined;
    client.executeRequest('req-process', {
      method: 'GET',
      url: 'https://api.test.com'
    }).then((d: unknown) => resolvedData = d).catch((e) => caughtError = e);

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(client.isFrozen).toBe(true);

    if (caughtError) {
      console.log('Caught Error:', caughtError.message);
    }

    // Reconnect and process queue
    mockNetworkResolver.mockResolvedValue(true);
    mockNetworkAdapter.request.mockResolvedValue({ data: 'replay-success', status: 200, statusText: 'OK', headers: {} });

    await client.processSynchronizedQueue(async () => true);

    await new Promise(resolve => setTimeout(resolve, 50));
    if (caughtError) console.log('Replay error:', caughtError);
    expect(resolvedData).toBe('replay-success');
    expect(client.isFrozen).toBe(false);
  });

  it('should block execution if integrity is compromised', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    // force memory compromised
    jest.spyOn(SovereignMemoryQueue.getInstance(), 'isIntegrityCompromised', 'get').mockReturnValue(true);

    await expect(client.executeRequest('req-compromised', { method: 'GET', url: 'https://api.test.com' })).rejects.toThrow(IntegrityBreachError);
    await expect(client.processSynchronizedQueue(async () => true)).rejects.toThrow(IntegrityBreachError);
  });

  it('should handle process queue verification failure', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    jest.spyOn(SovereignMemoryQueue.prototype, 'verifyLedgerIntegrity').mockResolvedValueOnce(false); // Fail integrity
    await expect(client.processSynchronizedQueue(async () => true)).rejects.toThrow(IntegrityBreachError);
  });

  it.skip('should handle process queue with DPoP auto-binding', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true,
      enableAutoDPoP: true,
      dpopAlgorithm: 'ES256'
    });

    await client.bootstrap(); // wait for dpop init

    mockNetworkResolver.mockResolvedValue(false);
    client.executeRequest('req-dpop-queue', {
      method: 'GET',
      url: 'https://api.test.com',
      headers: { 'Authorization': 'DPoP my-token' }
    }).catch(() => { });
    await new Promise(resolve => setTimeout(resolve, 0));

    mockNetworkAdapter.request.mockResolvedValue({ data: 'ok', status: 200, statusText: 'OK', headers: {} });
    await client.processSynchronizedQueue(async () => true);

    expect(mockNetworkAdapter.request).toHaveBeenCalled();
  });

  it('should throw if executeRequest called without network adapter', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: undefined as never,
      mock: true
    });

    await expect(client.executeRequest('req-no-adapter', { method: 'GET', url: 'x' })).rejects.toThrow(/requires a networkAdapter/);
  });

  it('should bootstrap DPoP', async () => {
    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true,
      enableAutoDPoP: true,
      dpopAlgorithm: 'ES256'
    });

    const jwk = await client.bootstrap();
    expect(jwk).toBeDefined();
    expect(client.getDPoPPublicKey()).toEqual(jwk);
  });

  it('should reject pending requests if they expire in RAM', async () => {
    mockNetworkResolver.mockResolvedValue(false);

    const client = SovereignClientCore.getInstance({
      cryptoProvider: mockCryptoProvider,
      networkResolver: mockNetworkResolver,
      networkAdapter: mockNetworkAdapter,
      mock: true
    });

    let caughtError: unknown;

    // Very short TTL
    client.executeRequest('req-expiry', {
      method: 'GET',
      url: 'https://api.test.com'
    }, undefined, { ttl: 1 }).catch((e: unknown) => caughtError = e);

    // Wait for the memory queue's internal setTimeout (which is 1ms) to fire
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(caughtError).toBeDefined();
    expect((caughtError as Error).message).toMatch(/expired in RAM/);
  });
});
