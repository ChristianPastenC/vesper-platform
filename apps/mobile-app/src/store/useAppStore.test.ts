import { renderHook, act } from '@testing-library/react-native';
import { useAppStore, useIsAuthenticated } from './useAppStore';
import i18n from '../core/i18n/i18n';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../core/i18n/i18n', () => ({
  __esModule: true,
  default: {
    changeLanguage: jest.fn(),
  },
}));

jest.mock('../core/auth/tokenStore', () => ({
  clearTokens: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
}));

describe('useAppStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.clearOnlineCart();
      result.current.clearInStoreCart();
    });
  });

  it('adds item to online cart and calculates total', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.addToOnlineCart({ id: '1', name: 'Item 1', price: 100 });
      result.current.addToOnlineCart({ id: '2', name: 'Item 2', price: 50 });
      result.current.addToOnlineCart({ id: '1', name: 'Item 1', price: 100 });
    });

    expect(result.current.onlineCart.length).toBe(2);
    expect(result.current.onlineCart[0].quantity).toBe(2);
    expect(result.current.getOnlineTotal()).toBe(250);
  });

  it('adds item to inStore cart and calculates total', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.addToInStoreCart({ id: '1', barcode: '111', name: 'Item 1', price: 10 });
      result.current.addToInStoreCart({ id: '2', barcode: '222', name: 'Item 2', price: 5 });
      result.current.addToInStoreCart({ id: '1', barcode: '111', name: 'Item 1', price: 10 });
    });

    expect(result.current.inStoreCart.length).toBe(2);
    expect(result.current.inStoreCart[0].quantity).toBe(2);
    expect(result.current.getInStoreTotal()).toBe(25);
  });

  it('logs in and out properly', async () => {
    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.login('test@test.com', 'Test User');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userName).toBe('Test User');

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userName).toBeNull();
  });

  it('initAuth sets isAuthenticated to true when token exists', async () => {
    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      await result.current.initAuth();
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('setIsAuthenticated sets auth state and username', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setIsAuthenticated(true, 'some_user');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userName).toBe('some_user');

    act(() => {
      result.current.setIsAuthenticated(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userName).toBeNull();
  });

  it('toggles network state', () => {
    const { result } = renderHook(() => useAppStore());

    // Default isOnline is true
    act(() => {
      result.current.toggleNetwork();
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      result.current.toggleNetwork();
    });
    expect(result.current.isOnline).toBe(true);
  });

  it('sets frozen state', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setFrozen(true);
    });
    expect(result.current.isFrozen).toBe(true);

    act(() => {
      result.current.setFrozen(false);
    });
    expect(result.current.isFrozen).toBe(false);
  });

  it('sets language and calls i18n', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setLanguage('es');
    });

    expect(result.current.language).toBe('es');
    expect(i18n.changeLanguage).toHaveBeenCalledWith('es');
  });

  it('sets theme mode', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setThemeMode('dark');
    });
    expect(result.current.themeMode).toBe('dark');

    act(() => {
      result.current.setThemeMode('light');
    });
    expect(result.current.themeMode).toBe('light');
  });

  it('useIsAuthenticated returns the auth state', () => {
    const { result: storeResult } = renderHook(() => useAppStore());
    act(() => {
      storeResult.current.login('a@a.com', 'A');
    });
    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(true);
  });

  it('signs up and falls back to default user name', async () => {
    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      // @ts-expect-error testing missing name
      await result.current.signUp('test@test.com', '');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userName).toBe('User');
  });

  it('login falls back to default user name', async () => {
    const { result } = renderHook(() => useAppStore());

    await act(async () => {
      // @ts-expect-error testing missing name
      await result.current.login('test@test.com', null);
    });

    expect(result.current.userName).toBe('User');
  });
});
