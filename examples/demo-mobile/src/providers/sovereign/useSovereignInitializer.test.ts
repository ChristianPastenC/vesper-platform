import { renderHook, waitFor } from '@testing-library/react-native';
import { useSovereignInitializer, secureClient } from './useSovereignInitializer';
import { useAppStore } from '../../store/useAppStore';

jest.mock('../../core/crypto/NativeCryptoProvider', () => ({
  nativeCryptoProvider: {},
}));

jest.mock('../../core/network/networkResolver', () => ({
  networkResolver: {},
  startNetworkTransitionsListener: jest.fn(),
  stopNetworkTransitionsListener: jest.fn(),
}));

jest.mock('../../core/network/handshakeValidator', () => ({
  validateHandshake: jest.fn(),
}));

jest.mock('../../store/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(),
  },
}));

let capturedObservers: Record<string, () => void>;
jest.mock('@sovereign/secure-client', () => {
  const mockClient = {
    bootstrap: jest.fn(),
  };
  return {
    SovereignClientCore: {
      getInstance: jest.fn((config) => {
        capturedObservers = config.observers;
        return mockClient;
      }),
    },
    FetchAdapter: jest.fn(),
  };
});

describe('useSovereignInitializer', () => {
  const mockInitAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      initAuth: mockInitAuth,
      setFrozen: jest.fn(),
    });
  });

  it('initializes sovereign client and sets bootstrap state to true', async () => {
    const mockJwk = { kty: 'RSA' } as JsonWebKey;
    (secureClient.bootstrap as jest.Mock).mockResolvedValue(mockJwk);

    const { result } = renderHook(() => useSovereignInitializer());

    expect(result.current.isBootstrapped).toBe(false);

    await waitFor(() => {
      expect(result.current.isBootstrapped).toBe(true);
    });

    expect(mockInitAuth).toHaveBeenCalled();
    expect(secureClient.bootstrap).toHaveBeenCalled();
    expect(result.current.dpopPublicKey).toEqual(mockJwk);
    expect(result.current.client).toBe(secureClient);
  });

  it('sets bootstrap to true even if initialization fails', async () => {
    (secureClient.bootstrap as jest.Mock).mockRejectedValue(new Error('Failed bootstrap'));

    const { result } = renderHook(() => useSovereignInitializer());

    await waitFor(() => {
      expect(result.current.isBootstrapped).toBe(true);
    });

    expect(result.current.dpopPublicKey).toBeNull();
  });

  it('triggers observer callbacks to update store frozen state', () => {
    const setFrozenMock = jest.fn();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      setFrozen: setFrozenMock,
    });

    // Trigger callbacks
    capturedObservers.onSessionFreeze();
    expect(setFrozenMock).toHaveBeenCalledWith(true);

    capturedObservers.onSessionResume();
    expect(setFrozenMock).toHaveBeenCalledWith(false);

    capturedObservers.onSessionPurge();
    expect(setFrozenMock).toHaveBeenCalledWith(false);
  });
});
