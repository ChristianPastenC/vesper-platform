import { renderHook, act } from '@testing-library/react-native';
import { useLogin } from './useLogin';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

describe('useLogin', () => {
  const mockT = jest.fn((key) => key);
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockLoginAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useNavigation as jest.Mock).mockReturnValue({ goBack: mockGoBack, canGoBack: mockCanGoBack });
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => selector({ login: mockLoginAction }));
  });

  it('validates missing fields', async () => {
    const { result } = renderHook(() => useLogin());
    
    await act(async () => {
      await result.current.handleLogin();
    });

    expect(result.current.error).toBe('auth.invalidError');
    expect(mockLoginAction).not.toHaveBeenCalled();
  });

  it('validates invalid email format', async () => {
    const { result } = renderHook(() => useLogin());
    
    act(() => {
      result.current.setName('Test');
      result.current.setEmail('invalid-email');
      result.current.setPassword('password');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(result.current.error).toBe('auth.invalidError');
    expect(mockLoginAction).not.toHaveBeenCalled();
  });

  it('calls loginAction and goes back on success', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockLoginAction.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogin());
    
    act(() => {
      result.current.setName('Test');
      result.current.setEmail('test@test.com');
      result.current.setPassword('password');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(mockLoginAction).toHaveBeenCalledWith('test@test.com', 'Test');
    expect(mockGoBack).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles login error', async () => {
    mockLoginAction.mockRejectedValue(new Error('Login failed'));

    const { result } = renderHook(() => useLogin());
    
    act(() => {
      result.current.setName('Test');
      result.current.setEmail('test@test.com');
      result.current.setPassword('password');
    });

    await act(async () => {
      await result.current.handleLogin();
    });

    expect(result.current.error).toBe('auth.invalidError');
  });
});
