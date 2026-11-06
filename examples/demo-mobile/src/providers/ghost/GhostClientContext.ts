import { createContext, useContext } from 'react';
import type { GhostClientCore } from '@vesper-core/ghost-ledger';

export interface GhostContextType {
  client: GhostClientCore;
  dpopPublicKey: JsonWebKey | null;
}

// Global context for accessing Ghost Client and public keys
export const GhostClientContext = createContext<GhostContextType | null>(null);

/**
 * Hook to consume the Ghost Client instance.
 * Ensures that consumers are wrapped inside the AppProvider/GhostClientProvider.
 */
export const useGhostClient = (): GhostClientCore => {
  const context = useContext(GhostClientContext);

  if (!context) {
    throw new Error(
      '[GhostClientContext] useGhostClient must be used within a GhostClientContext.Provider. ' +
        'Please ensure your component is wrapped inside AppProvider before calling this hook.',
    );
  }

  return context.client;
};

/**
 * Hook to consume the DPoP Public Key explicitly.
 */
export const useGhostDPoPKey = (): JsonWebKey | null => {
  const context = useContext(GhostClientContext);

  if (!context) {
    throw new Error(
      '[GhostClientContext] useGhostDPoPKey must be used within a GhostClientContext.Provider. ' +
        'Please ensure your component is wrapped inside AppProvider.',
    );
  }

  return context.dpopPublicKey;
};
