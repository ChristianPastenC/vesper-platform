import { renderHook, act } from '@testing-library/react-native';
import { useSovereignRegister } from './useSovereignRegister';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/sovereign/SovereignClientContext';
import { saveTokens } from '../../../core/auth/tokenStore';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => {
  const mockSetIsAuthenticated = jest.fn();
  const store = jest.fn() as unknown as { getState: () => { setIsAuthenticated: jest.Mock } };
  store.getState = jest.fn(() => ({ setIsAuthenticated: mockSetIsAuthenticated }));
  return { useAppStore: store };
});

jest.mock('../../../providers/sovereign/SovereignClientContext', () => ({
  useSovereignClient: jest.fn(),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  saveTokens: jest.fn(),
}));

jest.mock('react-native-quick-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('useSovereignRegister', () => {
  const mockT = jest.fn((key, defaultMsg) => defaultMsg || key);
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useNavigation as jest.Mock).mockReturnValue({ goBack: mockGoBack, canGoBack: mockCanGoBack });
    (useSovereignClient as jest.Mock).mockReturnValue({ executeRequest: mockExecuteRequest });
  });

  it('validates empty fields and sets error', async () => {
    const { result } = renderHook(() => useSovereignRegister());

    await act(async () => {
      await result.current.handleRegister();
    });

    expect(result.current.error).toBe('Username and email are required.');
  });

  it('validates invalid email format', async () => {
    const { result } = renderHook(() => useSovereignRegister());

    act(() => {
      result.current.setUsername('john_doe');
      result.current.setEmail('invalid-email');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleRegister();
    });

    expect(result.current.error).toBe('Invalid email format.');
  });

  it('validates short password', async () => {
    const { result } = renderHook(() => useSovereignRegister());

    act(() => {
      result.current.setUsername('john_doe');
      result.current.setEmail('john@example.com');
      result.current.setPassword('123'); // < 8 chars
    });

    await act(async () => {
      await result.current.handleRegister();
    });

    expect(result.current.error).toBe('Password must be at least 8 characters long.');
  });

  it('calls executeRequest, saves tokens, and logins successfully', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockExecuteRequest.mockResolvedValue({
      user: { id: '1', username: 'john_doe', email: 'john@example.com' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const { result } = renderHook(() => useSovereignRegister());

    act(() => {
      result.current.setUsername('john_doe');
      result.current.setEmail('john@example.com');
      result.current.setFirstName('John');
      result.current.setLastName('Doe');
      result.current.setPhone('1234567890');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleRegister();
    });

    expect(mockExecuteRequest).toHaveBeenCalled();
    expect(saveTokens).toHaveBeenCalledWith('access-token', 'refresh-token');

    const mockSetIsAuthenticated = useAppStore.getState().setIsAuthenticated;
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true, 'john_doe');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles API error', async () => {
    mockExecuteRequest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSovereignRegister());

    act(() => {
      result.current.setUsername('john_doe');
      result.current.setEmail('john@example.com');
      result.current.setPassword('password123');
    });

    await act(async () => {
      await result.current.handleRegister();
    });

    expect(result.current.error).toBe('Network error');
    expect(saveTokens).not.toHaveBeenCalled();

    const mockSetIsAuthenticated = useAppStore.getState().setIsAuthenticated;
    expect(mockSetIsAuthenticated).not.toHaveBeenCalled();
  });
});
