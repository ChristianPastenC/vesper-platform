import NetInfo from '@react-native-community/netinfo';
import type { NetworkStatusResolver, SovereignClientCore } from '@sovereign/secure-client';

let isCurrentlyOnline = false;
let unsubscribe: (() => void) | null = null;

/**
 * Resolves the current connectivity status on-demand.
 * Explicitly discards 'none' and 'unknown' states.
 */
export const networkResolver: NetworkStatusResolver = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  
  if (state.type === 'none' || state.type === 'unknown') {
    return false;
  }
  
  return state.isConnected ?? false;
};

/**
 * Initializes the network status listener.
 * Observes offline → online transitions and executes processSynchronizedQueue
 * on the provided Sovereign client instance.
 *
 * @param client Instance of SovereignClientCore
 * @param handshakeValidator Identity validation function for reconnections
 */
export const startNetworkTransitionsListener = (
  client: SovereignClientCore,
  handshakeValidator: () => Promise<boolean>
): void => {
  if (unsubscribe) {
    unsubscribe();
  }

  // Establish baseline state before listening to events
  networkResolver().then((online) => {
    isCurrentlyOnline = online;
  });

  unsubscribe = NetInfo.addEventListener((state) => {
    const isOnlineNow =
      state.type !== 'none' &&
      state.type !== 'unknown' &&
      state.isConnected === true;

    // Transition from Offline to Online
    if (!isCurrentlyOnline && isOnlineNow) {
      isCurrentlyOnline = true;
      
      // Trigger inactive queue synchronization (DPoP, Ledger, etc)
      client.processSynchronizedQueue(handshakeValidator).catch((err: unknown) => {
        console.error('[NetworkResolver] Failed to process synchronized queue post-reconnection:', err);
      });
    } 
    // Transition from Online to Offline
    else if (isCurrentlyOnline && !isOnlineNow) {
      isCurrentlyOnline = false;
    }
  });
};

/**
 * Stops listening for network transitions.
 */
export const stopNetworkTransitionsListener = (): void => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
