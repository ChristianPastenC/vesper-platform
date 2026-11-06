import NetInfo from '@react-native-community/netinfo';
import type { NetworkStatusResolver, GhostClientCore } from '@vesper-core/ghost-ledger';
import { GhostMemoryQueue } from '@vesper-core/ghost-ledger';
import { useAppStore } from '../../store/useAppStore';

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
 * on the provided Ghost client instance.
 *
 * @param client Instance of GhostClientCore
 * @param handshakeValidator Identity validation function for reconnections
 */
export const startNetworkTransitionsListener = (
  client: GhostClientCore,
  handshakeValidator: () => Promise<boolean>,
): void => {
  if (unsubscribe) {
    unsubscribe();
  }

  // Establish baseline state before listening to events
  networkResolver().then((online) => {
    isCurrentlyOnline = online;
    useAppStore.setState({ isOnline: online });
    // Mirror real connectivity into the native ledger: it only queues/hashes
    // requests (and thus only emits telemetry) while genuinely offline.
    GhostMemoryQueue.getInstance().toggleNetworkSim(online);
  });

  unsubscribe = NetInfo.addEventListener((state) => {
    const isOnlineNow =
      state.type !== 'none' && state.type !== 'unknown' && state.isConnected === true;

    // Transition from Offline to Online
    if (!isCurrentlyOnline && isOnlineNow) {
      isCurrentlyOnline = true;
      useAppStore.setState({ isOnline: true });
      GhostMemoryQueue.getInstance().toggleNetworkSim(true);

      // Trigger inactive queue synchronization (DPoP, Ledger, etc)
      client.processSynchronizedQueue(handshakeValidator).catch((err: unknown) => {
        console.error(
          '[NetworkResolver] Failed to process synchronized queue post-reconnection:',
          err,
        );
      });
    }
    // Transition from Online to Offline
    else if (isCurrentlyOnline && !isOnlineNow) {
      isCurrentlyOnline = false;
      useAppStore.setState({ isOnline: false });
      GhostMemoryQueue.getInstance().toggleNetworkSim(false);
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
