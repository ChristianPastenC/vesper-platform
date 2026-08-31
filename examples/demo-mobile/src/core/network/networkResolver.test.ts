import NetInfo from '@react-native-community/netinfo';
import {
  networkResolver,
  startNetworkTransitionsListener,
  stopNetworkTransitionsListener,
} from './networkResolver';
import { useAppStore } from '../../store/useAppStore';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('../../store/useAppStore', () => {
  const mockSet = jest.fn();
  return {
    useAppStore: {
      setState: mockSet,
      getState: jest.fn(),
    },
  };
});

describe('networkResolver', () => {
  let mockSet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSet = useAppStore.setState as jest.Mock;
    stopNetworkTransitionsListener();
  });

  describe('networkResolver()', () => {
    it('returns false when state type is none', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ type: 'none', isConnected: false });
      const result = await networkResolver();
      expect(result).toBe(false);
    });

    it('returns true when state is connected and valid type', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ type: 'wifi', isConnected: true });
      const result = await networkResolver();
      expect(result).toBe(true);
    });
  });

  describe('startNetworkTransitionsListener()', () => {
    const mockClient = {
      processSynchronizedQueue: jest.fn().mockResolvedValue(true),
    } as unknown as import('@vesper-core/ghost-ledger').SovereignClientCore;
    const mockValidator = jest.fn().mockResolvedValue(true);

    it('establishes baseline state and sets store to online when network is true', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ type: 'wifi', isConnected: true });

      startNetworkTransitionsListener(mockClient, mockValidator);

      // wait for the promise to resolve
      await new Promise((r) => setTimeout(r, 0));

      expect(mockSet).toHaveBeenCalledWith({ isOnline: true });
    });

    it('listens for network transitions and sets store to offline when network drops', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ type: 'wifi', isConnected: true });

      let listenerCallback: (state: { type: string; isConnected: boolean }) => void;
      (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
        listenerCallback = cb;
        return jest.fn(); // return unsubscribe fn
      });

      startNetworkTransitionsListener(mockClient, mockValidator);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockSet).toHaveBeenCalledWith({ isOnline: true });

      // Simulate offline transition
      listenerCallback({ type: 'none', isConnected: false });

      expect(mockSet).toHaveBeenCalledWith({ isOnline: false });
    });

    it('listens for network transitions, sets store to online, and calls processSynchronizedQueue', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ type: 'none', isConnected: false });

      let listenerCallback: (state: { type: string; isConnected: boolean }) => void;
      (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
        listenerCallback = cb;
        return jest.fn(); // return unsubscribe fn
      });

      startNetworkTransitionsListener(mockClient, mockValidator);
      await new Promise((r) => setTimeout(r, 0));
      expect(mockSet).toHaveBeenCalledWith({ isOnline: false });

      // Simulate online transition
      listenerCallback({ type: 'wifi', isConnected: true });

      expect(mockSet).toHaveBeenCalledWith({ isOnline: true });
      expect(mockClient.processSynchronizedQueue).toHaveBeenCalledWith(mockValidator);
    });
  });
});
