import { useState, useEffect } from 'react';
import { SovereignClientCore, FetchAdapter } from '@vesper-core/ghost-ledger';
import { nativeCryptoProvider } from '../../core/crypto/NativeCryptoProvider';
import {
  networkResolver,
  startNetworkTransitionsListener,
  stopNetworkTransitionsListener,
} from '../../core/network/networkResolver';
import { validateHandshake } from '../../core/network/handshakeValidator';
import { getTelemetryApiKey, getTelemetryBundleId, getTelemetryEndpoint } from '../../core/config';

// Import useAppStore correctly at runtime to avoid circular dependency issues at boot
import { useAppStore } from '../../store/useAppStore';

const telemetryApiKey = getTelemetryApiKey();
if (!telemetryApiKey) {
  console.warn(
    '[SovereignClient] EXPO_PUBLIC_TELEMETRY_API_KEY is not set. Telemetry ingestion is disabled.',
  );
}

// 1. Initialize the real SovereignClientCore instance
export const secureClient = SovereignClientCore.getInstance({
  cryptoProvider: nativeCryptoProvider,
  networkResolver: networkResolver,
  networkAdapter: new FetchAdapter(),
  enableAutoDPoP: true,
  mock: false,
  telemetry: telemetryApiKey
    ? {
        apiKey: telemetryApiKey,
        bundleId: getTelemetryBundleId(),
        endpoint: getTelemetryEndpoint(),
      }
    : undefined,
  observers: {
    onSessionFreeze: () => {
      console.log('[SovereignClient] Session Frozen (Volatile RAM active)');
      useAppStore.getState().setFrozen(true);
    },
    onSessionResume: () => {
      console.log('[SovereignClient] Session Resumed (Volatile RAM flushed)');
      useAppStore.getState().setFrozen(false);
    },
    onSessionPurge: () => {
      console.log('[SovereignClient] Session Purged (Security breach or forced drop)');
      useAppStore.getState().setFrozen(false);
    },
  },
});

export const useSovereignInitializer = () => {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [dpopPublicKey, setDpopPublicKey] = useState<JsonWebKey | null>(null);

  useEffect(() => {
    // Setup Network listener to process inactive queues on reconnection
    startNetworkTransitionsListener(secureClient, validateHandshake);

    // Bootstrap DPoP keys asynchronously before the first protected render
    const initSovereignClient = async () => {
      try {
        await useAppStore.getState().initAuth();

        const jwk = await secureClient.bootstrap();
        setDpopPublicKey(jwk);
        console.log(
          '[useSovereignInitializer] Successfully bootstrapped Sovereign Client and DPoP keys.',
        );
      } catch (error) {
        console.error(
          '[useSovereignInitializer] Failed to bootstrap SovereignClientCore DPoP keys:',
          error,
        );
      } finally {
        setIsBootstrapped(true);
      }
    };

    initSovereignClient();

    // Cleanup listeners on unmount
    return () => {
      stopNetworkTransitionsListener();
    };
  }, []);

  return {
    client: secureClient,
    isBootstrapped,
    dpopPublicKey,
  };
};
