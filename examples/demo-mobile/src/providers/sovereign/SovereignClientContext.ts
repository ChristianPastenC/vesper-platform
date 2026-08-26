import { createContext, useContext } from 'react';
import type { SovereignClientCore } from '@vesper/ghost-ledger';

export interface SovereignContextType {
  client: SovereignClientCore;
  dpopPublicKey: JsonWebKey | null;
}

// Global context for accessing Sovereign Client and public keys
export const SovereignClientContext = createContext<SovereignContextType | null>(null);

/**
 * Hook to consume the Sovereign Client instance.
 * Ensures that consumers are wrapped inside the AppProvider/SovereignClientProvider.
 */
export const useSovereignClient = (): SovereignClientCore => {
  const context = useContext(SovereignClientContext);

  if (!context) {
    throw new Error(
      '[SovereignClientContext] useSovereignClient must be used within a SovereignClientContext.Provider. ' +
        'Please ensure your component is wrapped inside AppProvider before calling this hook.',
    );
  }

  return context.client;
};

/**
 * Hook to consume the DPoP Public Key explicitly.
 */
export const useSovereignDPoPKey = (): JsonWebKey | null => {
  const context = useContext(SovereignClientContext);

  if (!context) {
    throw new Error(
      '[SovereignClientContext] useSovereignDPoPKey must be used within a SovereignClientContext.Provider. ' +
        'Please ensure your component is wrapped inside AppProvider.',
    );
  }

  return context.dpopPublicKey;
};
