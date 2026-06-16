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

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../../../providers/SovereignClientContext', () => ({
  useSovereignClient: jest.fn(),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  saveTokens: jest.fn(),
}));

describe('useSovereignLogin', () => {
  const mockT = jest.fn((key) => key);
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockLoginAction = jest.fn();
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useNavigation as jest.Mock).mockReturnValue({ goBack: mockGoBack, canGoBack: mockCanGoBack });
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => selector({ login: mockLoginAction }));
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
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const { result } = renderHook(() => useSovereignLogin());

    act(() => {
      result.current.setName('John Doe');
      result.current.setEmail('john@example.com');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(mockExecuteRequest).toHaveBeenCalled();
    expect(saveTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(mockLoginAction).toHaveBeenCalledWith('john@example.com', 'John Doe');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles API error', async () => {
    mockExecuteRequest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSovereignLogin());

    act(() => {
      result.current.setName('John Doe');
      result.current.setEmail('john@example.com');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(result.current.error).toBe('auth.invalidError');
    expect(saveTokens).not.toHaveBeenCalled();
    expect(mockLoginAction).not.toHaveBeenCalled();
  });
});
