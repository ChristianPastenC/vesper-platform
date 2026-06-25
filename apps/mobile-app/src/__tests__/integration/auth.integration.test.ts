import { renderHook, act } from '@testing-library/react-native';
import { useSovereignLogin } from '../../features/auth/hooks/useSovereignLogin';
import { useAppStore } from '../../store/useAppStore';
import * as tokenStore from '../../core/auth/tokenStore';
import { FetchAdapter, SovereignClientCore } from '@sovereign/secure-client';

jest.mock('../../core/auth/tokenStore', () => ({
  saveTokens: jest.fn(),
  getAccessToken: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: jest.fn().mockReturnValue(true), goBack: jest.fn() }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fb: string) => fb }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('../../core/i18n/i18n', () => ({
  use: () => ({ init: jest.fn() }),
  changeLanguage: jest.fn(),
  t: (key: string) => key,
}));

const mockRequest = jest.fn();
const mockAdapter = new FetchAdapter();
mockAdapter.request = mockRequest;

const mockClient = SovereignClientCore.getInstance({
  mock: true,
  cryptoProvider: {
    sha256: jest.fn(),
    randomBytes: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encryptAesGcm: jest.fn(),
    decryptAesGcm: jest.fn(),
    wrapKeyRsaOaep: jest.fn(),
  } as unknown as import('@sovereign/secure-client').IDPoPCryptoProvider,
  networkResolver: async () => true,
  networkAdapter: mockAdapter,
  errorTrapping: { freezeOn503_504: false, freezeOn401: false },
});

jest.mock('../../providers/sovereign/SovereignClientContext', () => ({
  useSovereignClient: () => mockClient,
}));

jest.mock('../../core/config', () => ({
  getApiUrl: () => 'https://api.test',
}));

describe('Integration: Auth Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({ isAuthenticated: false, userName: null });
  });

  it('handles valid login and invalid login correctly', async () => {
    const { result } = renderHook(() => useSovereignLogin());

    mockRequest.mockResolvedValueOnce({
      status: 200,
      data: {
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
        accessToken: 'valid-jwt',
        refreshToken: 'valid-refresh',
      },
    });

    act(() => {
      result.current.setName('Test');
      result.current.setEmail('test@example.com');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    // a. Verify saveTokens was called with correct tokens
    expect(tokenStore.saveTokens).toHaveBeenCalledWith('valid-jwt', 'valid-refresh');

    // b. Verify useAppStore.getState().isAuthenticated === true
    expect(useAppStore.getState().isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();

    // c. Verify a second login with invalid credentials sets error state
    mockRequest.mockRejectedValueOnce(new Error('Invalid credentials'));

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(result.current.error).toBe('Invalid credentials');
    expect(useAppStore.getState().isAuthenticated).toBe(true); // retains previous state
  });
});
