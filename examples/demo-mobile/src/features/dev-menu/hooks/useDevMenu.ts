import { useCallback, useEffect, useState } from 'react';
import {
  SovereignMemoryQueue,
  serializeAdapterRequest,
  encodeJsonBody,
  type SovereignAdapterRequest,
} from '@vesper-core/ghost-ledger';
import { secureClient } from '../../../providers/sovereign/useSovereignInitializer';
import { nativeCryptoProvider } from '../../../core/crypto/NativeCryptoProvider';
import { validateHandshake } from '../../../core/network/handshakeValidator';
import { getApiUrl, getTelemetryApiKey, getTelemetryBundleId, getTelemetryEndpoint } from '../../../core/config';
import { useAppStore } from '../../../store/useAppStore';

export interface DevMenuStatus {
  queueSize: number;
  isLocked: boolean;
  isIntegrityCompromised: boolean;
}

export interface FlushResult {
  success: boolean;
  eventCount: number;
  message: string;
}

const buildSimulatedRequest = (label: string): SovereignAdapterRequest => ({
  method: 'POST',
  url: `${getApiUrl()}/dev-menu/simulated-transaction`,
  headers: { 'Content-Type': 'application/json' },
  body: encodeJsonBody({ simulated: true, label, ts: Date.now() }),
});

export const useDevMenu = () => {
  const isFrozen = useAppStore((state) => state.isFrozen);
  const [status, setStatus] = useState<DevMenuStatus>({
    queueSize: 0,
    isLocked: false,
    isIntegrityCompromised: false,
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [lastFlushResult, setLastFlushResult] = useState<FlushResult | null>(null);
  const [lastEnqueuedId, setLastEnqueuedId] = useState<string | null>(null);

  const refreshStatus = useCallback(() => {
    const queue = SovereignMemoryQueue.getInstance();
    setStatus({
      queueSize: queue.size,
      isLocked: queue.getLocked(),
      isIntegrityCompromised: queue.isIntegrityCompromised,
    });
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const simulateOffline = useCallback(() => {
    SovereignMemoryQueue.getInstance().toggleNetworkSim(false);
    setIsSimulatedOffline(true);
    refreshStatus();
  }, [refreshStatus]);

  const simulateOnline = useCallback(async () => {
    setIsBusy(true);
    try {
      SovereignMemoryQueue.getInstance().toggleNetworkSim(true);
      setIsSimulatedOffline(false);
      await secureClient.processSynchronizedQueue(validateHandshake);
    } finally {
      refreshStatus();
      setIsBusy(false);
    }
  }, [refreshStatus]);

  const stopOperation = useCallback(() => {
    secureClient.purgeAll();
    SovereignMemoryQueue.getInstance().toggleNetworkSim(false);
    setIsSimulatedOffline(true);
    refreshStatus();
  }, [refreshStatus]);

  const flushTelemetryNow = useCallback(async (): Promise<FlushResult> => {
    const queue = SovereignMemoryQueue.getInstance();
    const snapshot = queue.getTelemetrySnapshot();
    const eventCount = Math.floor(snapshot.length / 17);

    let result: FlushResult;
    if (eventCount === 0) {
      result = { success: false, eventCount: 0, message: 'No telemetry events buffered to flush.' };
      setLastFlushResult(result);
      return result;
    }

    const apiKey = getTelemetryApiKey();
    if (!apiKey) {
      result = {
        success: false,
        eventCount,
        message: 'EXPO_PUBLIC_TELEMETRY_API_KEY is not configured.',
      };
      setLastFlushResult(result);
      return result;
    }

    try {
      const response = await fetch(getTelemetryEndpoint(), {
        method: 'POST',
        headers: {
          'X-Sovereign-API-Key': apiKey,
          'X-Bundle-ID': getTelemetryBundleId(),
          'Content-Type': 'application/octet-stream',
        },
        body: snapshot.buffer as unknown as BodyInit,
      });

      result = response.ok
        ? { success: true, eventCount, message: `Sent ${eventCount} event(s) to the dashboard.` }
        : { success: false, eventCount, message: `Ingestion API responded with ${response.status}.` };
    } catch (error) {
      result = {
        success: false,
        eventCount,
        message: error instanceof Error ? error.message : 'Telemetry flush failed.',
      };
    }

    setLastFlushResult(result);
    return result;
  }, []);

  // These two are split (rather than the combined enqueue+dequeue that
  // simulateE2EEvent does) specifically so the Frida DAST pipeline can scan
  // process memory *between* the two steps: once right after enqueue, to
  // confirm the payload really is resident in the native ledger, and once
  // after dequeue, to confirm zeroize() actually scrubbed it. Without a way
  // to pause between them, a memory scan can only ever observe the
  // already-zeroized end state, which made the "In-Memory Key Extraction"
  // row meaningless (it always found nothing, on every build).
  const enqueueTestPayload = useCallback(
    async (label: string): Promise<string> => {
      setIsBusy(true);
      try {
        const queue = SovereignMemoryQueue.getInstance();
        queue.toggleNetworkSim(false);
        setIsSimulatedOffline(true);

        const requestId = `dast-${Date.now()}`;
        const request = buildSimulatedRequest(label);
        const binaryRequest = serializeAdapterRequest(request);

        await queue.enqueue(nativeCryptoProvider, requestId, binaryRequest, 60_000, () => {});
        setLastEnqueuedId(requestId);
        refreshStatus();
        return requestId;
      } finally {
        setIsBusy(false);
      }
    },
    [refreshStatus],
  );

  const dequeueTestPayload = useCallback(async (): Promise<void> => {
    if (!lastEnqueuedId) return;
    setIsBusy(true);
    try {
      const queue = SovereignMemoryQueue.getInstance();
      await queue.dequeue(nativeCryptoProvider, lastEnqueuedId);
      setLastEnqueuedId(null);
      refreshStatus();
    } finally {
      setIsBusy(false);
    }
  }, [lastEnqueuedId, refreshStatus]);

  const simulateE2EEvent = useCallback(async (): Promise<FlushResult> => {
    setIsBusy(true);
    try {
      const queue = SovereignMemoryQueue.getInstance();
      queue.toggleNetworkSim(false);
      setIsSimulatedOffline(true);

      const requestId = `dev-menu-${Date.now()}`;
      const request = buildSimulatedRequest(requestId);
      const binaryRequest = serializeAdapterRequest(request);

      await queue.enqueue(nativeCryptoProvider, requestId, binaryRequest, 60_000, () => {});
      refreshStatus();

      await queue.dequeue(nativeCryptoProvider, requestId);
      refreshStatus();

      return await flushTelemetryNow();
    } finally {
      setIsBusy(false);
    }
  }, [flushTelemetryNow, refreshStatus]);

  return {
    status,
    isFrozen,
    isSimulatedOffline,
    isBusy,
    lastFlushResult,
    lastEnqueuedId,
    refreshStatus,
    simulateOffline,
    simulateOnline,
    stopOperation,
    flushTelemetryNow,
    simulateE2EEvent,
    enqueueTestPayload,
    dequeueTestPayload,
  };
};
