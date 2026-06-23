import { renderHook, act } from '@testing-library/react-native';
import { useSovereignLogin } from './useSovereignLogin';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/SovereignClientContext';
import { saveTokens } from '../../../core/auth/tokenStore';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => {
  const mockSetIsAuthenticated = jest.fn();
  const store = jest.fn() as any;
  store.getState = jest.fn(() => ({ setIsAuthenticated: mockSetIsAuthenticated }));
  return { useAppStore: store };
});

jest.mock('../../../providers/SovereignClientContext', () => ({
  useSovereignClient: jest.fn(),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  saveTokens: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('useSovereignLogin', () => {
  const mockT = jest.fn((key) => key);
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useNavigation as jest.Mock).mockReturnValue({ goBack: mockGoBack, canGoBack: mockCanGoBack });
    (useSovereignClient as jest.Mock).mockReturnValue({ executeRequest: mockExecuteRequest });
  });

  it('validates fields and sets error', async () => {
    const { result } = renderHook(() => useSovereignLogin());

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(result.current.error).toBe('auth.invalidError');
  });

  it('calls executeRequest, saves tokens, and logins successfully', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockExecuteRequest.mockResolvedValue({
      user: { username: 'john_doe' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const { result } = renderHook(() => useSovereignLogin());

    act(() => {
      result.current.setUsername('john_doe');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(mockExecuteRequest).toHaveBeenCalled();
    expect(saveTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    
    const mockSetIsAuthenticated = useAppStore.getState().setIsAuthenticated;
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true, 'john_doe');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles API error', async () => {
    mockExecuteRequest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSovereignLogin());

    act(() => {
      result.current.setUsername('john_doe');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(result.current.error).toBe('Network error');
    expect(saveTokens).not.toHaveBeenCalled();
    
    const mockSetIsAuthenticated = useAppStore.getState().setIsAuthenticated;
    expect(mockSetIsAuthenticated).not.toHaveBeenCalled();
  });
});
