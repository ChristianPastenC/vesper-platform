import { NetInfoState, NetInfoChangeHandler } from '@react-native-community/netinfo';

type NetworkListener = (state: NetInfoState) => void;

let listeners: NetworkListener[] = [];
let currentNetworkState: NetInfoState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: null,
};

export const simulateNetworkDrop = () => {
  currentNetworkState = {
    ...currentNetworkState,
    isConnected: false,
    isInternetReachable: false,
  };
  listeners.forEach((listener) => listener(currentNetworkState));
};

export const simulateNetworkRestore = () => {
  currentNetworkState = {
    ...currentNetworkState,
    isConnected: true,
    isInternetReachable: true,
  };
  listeners.forEach((listener) => listener(currentNetworkState));
};

export const mockNetInfo = {
  addEventListener: (listener: NetworkListener) => {
    listeners.push(listener);
    // Trigger immediately with the current state
    listener(currentNetworkState);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
  fetch: async () => currentNetworkState,
};

export const resetNetworkMock = () => {
  listeners = [];
  simulateNetworkRestore();
};
