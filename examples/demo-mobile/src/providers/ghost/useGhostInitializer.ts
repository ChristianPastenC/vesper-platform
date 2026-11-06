import { useState, useEffect } from 'react';
import { GhostClientCore, FetchAdapter } from '@vesper-core/ghost-ledger';
import { hardwareSecurityProvider } from '../../core/crypto/HardwareSecurityProvider';
import { deviceIntegrityGuard } from '../../core/security/DeviceIntegrityGuard';
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
    '[GhostClient] TELEMETRY_API_KEY is not set. Telemetry ingestion is disabled.',
  );
}

// 1. Initialize the real GhostClientCore instance anchored to Hardware Security (StrongBox / Secure Enclave)
export const secureClient = GhostClientCore.getInstance({
  cryptoProvider: hardwareSecurityProvider,
  networkResolver: networkResolver,
  networkAdapter: new FetchAdapter(),
  enableAutoDPoP: true,
  mock: process.env.EXPO_PUBLIC_GHOST_MOCK === 'true',
  telemetry: telemetryApiKey
    ? {
        apiKey: telemetryApiKey,
        bundleId: getTelemetryBundleId(),
        endpoint: getTelemetryEndpoint(),
      }
    : undefined,
  observers: {
    onSessionFreeze: () => {
      console.log('[GhostClient] Session Frozen (Volatile RAM active)');
      useAppStore.getState().setFrozen(true);
    },
    onSessionResume: () => {
      console.log('[GhostClient] Session Resumed (Volatile RAM flushed)');
      useAppStore.getState().setFrozen(false);
    },
    onSessionPurge: () => {
      console.log('[GhostClient] Session Purged (Security breach or forced drop)');
      useAppStore.getState().setFrozen(false);
    },
  },
});

export const useGhostInitializer = () => {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [dpopPublicKey, setDpopPublicKey] = useState<JsonWebKey | null>(null);

  useEffect(() => {
    // Setup Network listener to process inactive queues on reconnection
    startNetworkTransitionsListener(secureClient, validateHandshake);

    // Bootstrap DPoP keys asynchronously before the first protected render
    const initGhostClient = async () => {
      try {
        // Enforce active device integrity checks (Fail-Closed against Root/Frida)
        const integrityStatus = await deviceIntegrityGuard.evaluateIntegrity();
        if (integrityStatus.isDeviceCompromised) {
          console.error(
            '[useGhostInitializer] CRITICAL: Device integrity compromised. Tampering detected:',
            integrityStatus.violationReason,
          );
          // Fail-closed policy: immediately purge memory and block deferred offline execution
          useAppStore.getState().setFrozen(false);
          setIsBootstrapped(false);
          return;
        }

        await useAppStore.getState().initAuth();

        const jwk = await secureClient.bootstrap();
        setDpopPublicKey(jwk);
        console.log(
          '[useGhostInitializer] Successfully bootstrapped Ghost Client and DPoP keys with Hardware Enclave.',
        );
      } catch (error) {
        console.error(
          '[useGhostInitializer] Failed to bootstrap GhostClientCore DPoP keys:',
          error,
        );
      } finally {
        setIsBootstrapped(true);
      }
    };

    initGhostClient();

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
