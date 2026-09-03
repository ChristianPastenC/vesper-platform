import { renderHook, act } from '@testing-library/react-native';
import { useDevMenu } from './useDevMenu';
import { SovereignMemoryQueue } from '@vesper-core/ghost-ledger';
import { secureClient } from '../../../providers/sovereign/useSovereignInitializer';
import { getTelemetryApiKey } from '../../../core/config';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../../../providers/sovereign/useSovereignInitializer', () => ({
  secureClient: {
    purgeAll: jest.fn(),
    processSynchronizedQueue: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../core/network/handshakeValidator', () => ({
  validateHandshake: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../core/crypto/NativeCryptoProvider', () => ({
  nativeCryptoProvider: {},
}));

jest.mock('../../../core/config', () => ({
  getApiUrl: jest.fn(() => 'http://10.0.2.2:8080'),
  getTelemetryApiKey: jest.fn(),
  getTelemetryBundleId: jest.fn(() => 'com.demo.app'),
  getTelemetryEndpoint: jest.fn(() => 'http://127.0.0.1:8081/api/v1/support/telemetry'),
}));

const mockQueue = {
  size: 0,
  getLocked: jest.fn(() => false),
  isIntegrityCompromised: false,
  toggleNetworkSim: jest.fn(),
  getTelemetrySnapshot: jest.fn(() => new Uint8Array(0)),
  enqueue: jest.fn().mockResolvedValue(undefined),
  dequeue: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@vesper-core/ghost-ledger', () => ({
  SovereignMemoryQueue: { getInstance: jest.fn() },
  serializeAdapterRequest: jest.fn(() => new Uint8Array([1, 2, 3])),
  encodeJsonBody: jest.fn(() => new Uint8Array([4, 5, 6])),
}));

describe('useDevMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueue.size = 0;
    mockQueue.isIntegrityCompromised = false;
    (SovereignMemoryQueue.getInstance as jest.Mock).mockReturnValue(mockQueue);
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ isFrozen: false }),
    );
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it('reports the current ledger status on mount', () => {
    mockQueue.size = 2;
    mockQueue.isIntegrityCompromised = true;

    const { result } = renderHook(() => useDevMenu());

    expect(result.current.status).toEqual({
      queueSize: 2,
      isLocked: false,
      isIntegrityCompromised: true,
    });
  });

  it('simulates going offline by toggling the native network flag', () => {
    const { result } = renderHook(() => useDevMenu());

    act(() => {
      result.current.simulateOffline();
    });

    expect(mockQueue.toggleNetworkSim).toHaveBeenCalledWith(false);
    expect(result.current.isSimulatedOffline).toBe(true);
  });

  it('resumes network and flushes the synchronized queue', async () => {
    const { result } = renderHook(() => useDevMenu());

    await act(async () => {
      await result.current.simulateOnline();
    });

    expect(mockQueue.toggleNetworkSim).toHaveBeenCalledWith(true);
    expect(secureClient.processSynchronizedQueue).toHaveBeenCalledTimes(1);
    expect(result.current.isSimulatedOffline).toBe(false);
  });

  it('stops operation by purging the client and forcing offline mode', () => {
    const { result } = renderHook(() => useDevMenu());

    act(() => {
      result.current.stopOperation();
    });

    expect(secureClient.purgeAll).toHaveBeenCalledTimes(1);
    expect(mockQueue.toggleNetworkSim).toHaveBeenCalledWith(false);
  });

  it('reports failure when flushing telemetry with an empty buffer', async () => {
    const { result } = renderHook(() => useDevMenu());

    let flushResult;
    await act(async () => {
      flushResult = await result.current.flushTelemetryNow();
    });

    expect(flushResult).toEqual({
      success: false,
      eventCount: 0,
      message: 'No telemetry events buffered to flush.',
    });
  });

  it('reports failure when flushing telemetry without an API key configured', async () => {
    mockQueue.getTelemetrySnapshot.mockReturnValue(new Uint8Array(17));
    (getTelemetryApiKey as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useDevMenu());

    let flushResult;
    await act(async () => {
      flushResult = await result.current.flushTelemetryNow();
    });

    expect(flushResult).toEqual({
      success: false,
      eventCount: 1,
      message: 'EXPO_PUBLIC_TELEMETRY_API_KEY is not configured.',
    });
  });

  it('flushes buffered telemetry successfully when an API key is configured', async () => {
    mockQueue.getTelemetrySnapshot.mockReturnValue(new Uint8Array(34));
    (getTelemetryApiKey as jest.Mock).mockReturnValue('sk_test');

    const { result } = renderHook(() => useDevMenu());

    let flushResult;
    await act(async () => {
      flushResult = await result.current.flushTelemetryNow();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8081/api/v1/support/telemetry',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(flushResult).toEqual({
      success: true,
      eventCount: 2,
      message: 'Sent 2 event(s) to the dashboard.',
    });
  });

  it('reports failure when the ingestion API responds with a non-OK status', async () => {
    mockQueue.getTelemetrySnapshot.mockReturnValue(new Uint8Array(17));
    (getTelemetryApiKey as jest.Mock).mockReturnValue('sk_test');
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useDevMenu());

    let flushResult;
    await act(async () => {
      flushResult = await result.current.flushTelemetryNow();
    });

    expect(flushResult).toEqual({
      success: false,
      eventCount: 1,
      message: 'Ingestion API responded with 500.',
    });
  });

  it('reports the error message when the flush request throws', async () => {
    mockQueue.getTelemetrySnapshot.mockReturnValue(new Uint8Array(17));
    (getTelemetryApiKey as jest.Mock).mockReturnValue('sk_test');
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network unreachable'));

    const { result } = renderHook(() => useDevMenu());

    let flushResult;
    await act(async () => {
      flushResult = await result.current.flushTelemetryNow();
    });

    expect(flushResult).toEqual({
      success: false,
      eventCount: 1,
      message: 'Network unreachable',
    });
  });

  it('falls back to a generic message when the flush request throws a non-Error value', async () => {
    mockQueue.getTelemetrySnapshot.mockReturnValue(new Uint8Array(17));
    (getTelemetryApiKey as jest.Mock).mockReturnValue('sk_test');
    (global.fetch as jest.Mock).mockRejectedValue('boom');

    const { result } = renderHook(() => useDevMenu());

    let flushResult;
    await act(async () => {
      flushResult = await result.current.flushTelemetryNow();
    });

    expect(flushResult).toEqual({
      success: false,
      eventCount: 1,
      message: 'Telemetry flush failed.',
    });
  });

  it('simulates a full E2E event: enqueue, dequeue, then flush', async () => {
    mockQueue.getTelemetrySnapshot.mockReturnValue(new Uint8Array(17));
    (getTelemetryApiKey as jest.Mock).mockReturnValue('sk_test');

    const { result } = renderHook(() => useDevMenu());

    await act(async () => {
      await result.current.simulateE2EEvent();
    });

    expect(mockQueue.toggleNetworkSim).toHaveBeenCalledWith(false);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(mockQueue.dequeue).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.lastFlushResult?.success).toBe(true);
  });

  it('enqueues a labeled test payload and forces offline mode, without dequeuing it', async () => {
    const { result } = renderHook(() => useDevMenu());

    let requestId: string | undefined;
    await act(async () => {
      requestId = await result.current.enqueueTestPayload('GHOST_SEC_test');
    });

    expect(mockQueue.toggleNetworkSim).toHaveBeenCalledWith(false);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(mockQueue.dequeue).not.toHaveBeenCalled();
    expect(result.current.isSimulatedOffline).toBe(true);
    expect(result.current.lastEnqueuedId).toBe(requestId);
  });

  it('dequeues the most recently enqueued test payload', async () => {
    const { result } = renderHook(() => useDevMenu());

    await act(async () => {
      await result.current.enqueueTestPayload('GHOST_SEC_test');
    });
    await act(async () => {
      await result.current.dequeueTestPayload();
    });

    expect(mockQueue.dequeue).toHaveBeenCalledTimes(1);
    expect(result.current.lastEnqueuedId).toBeNull();
  });

  it('does nothing when dequeuing without a prior enqueue', async () => {
    const { result } = renderHook(() => useDevMenu());

    await act(async () => {
      await result.current.dequeueTestPayload();
    });

    expect(mockQueue.dequeue).not.toHaveBeenCalled();
  });
});
