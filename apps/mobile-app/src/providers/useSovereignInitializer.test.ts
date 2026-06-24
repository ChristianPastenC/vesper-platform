import { renderHook, waitFor } from '@testing-library/react-native';
import { useSovereignInitializer, secureClient } from './useSovereignInitializer';
import { useAppStore } from '../store/useAppStore';

jest.mock('../core/crypto/NativeCryptoProvider', () => ({
  nativeCryptoProvider: {},
}));

jest.mock('../core/network/networkResolver', () => ({
  networkResolver: {},
  startNetworkTransitionsListener: jest.fn(),
  stopNetworkTransitionsListener: jest.fn(),
}));

jest.mock('../core/network/handshakeValidator', () => ({
  validateHandshake: jest.fn(),
}));

jest.mock('../store/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@sovereign/secure-client', () => {
  const mockClient = {
    bootstrap: jest.fn(),
  };
  return {
    SovereignClientCore: {
      getInstance: jest.fn(() => mockClient),
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
});
