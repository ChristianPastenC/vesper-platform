import { saveTokens, getAccessToken, getRefreshToken, clearTokens } from './tokenStore';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

describe('tokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves tokens correctly when both are provided', async () => {
    await saveTokens('access-token', 'refresh-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'access-token', {
      keychainAccessible: 'AFTER_FIRST_UNLOCK',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'refresh-token', {
      keychainAccessible: 'AFTER_FIRST_UNLOCK',
    });
  });

  it('saves only access token if refresh token is not provided', async () => {
    await saveTokens('access-token', '');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'access-token', {
      keychainAccessible: 'AFTER_FIRST_UNLOCK',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('saves only refresh token if access token is not provided', async () => {
    await saveTokens('', 'refresh-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'refresh-token', {
      keychainAccessible: 'AFTER_FIRST_UNLOCK',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('gets access token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('mock-access');
    const token = await getAccessToken();
    expect(token).toBe('mock-access');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('accessToken');
  });

  it('gets refresh token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('mock-refresh');
    const token = await getRefreshToken();
    expect(token).toBe('mock-refresh');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('refreshToken');
  });

  it('clears tokens', async () => {
    await clearTokens();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
  });
});
