import { renderHook, act } from '@testing-library/react-native';
import { useAppStore, useIsAuthenticated } from './useAppStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../core/i18n/i18n', () => ({
  changeLanguage: jest.fn(),
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
      result.current.addToOnlineCart({ id: '1', name: 'Item 1', price: 100 });
      result.current.addToOnlineCart({ id: '2', name: 'Item 2', price: 50 });
    });

    expect(result.current.onlineCart.length).toBe(2);
    expect(result.current.onlineCart[0].quantity).toBe(2);
    expect(result.current.getOnlineTotal()).toBe(250);
  });

  it('adds item to inStore cart and calculates total', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.addToInStoreCart({ id: '1', barcode: '111', name: 'Item 1', price: 10 });
      result.current.addToInStoreCart({ id: '1', barcode: '111', name: 'Item 1', price: 10 });
    });

    expect(result.current.inStoreCart.length).toBe(1);
    expect(result.current.inStoreCart[0].quantity).toBe(2);
    expect(result.current.getInStoreTotal()).toBe(20);
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

  it('useIsAuthenticated returns the auth state', () => {
    const { result: storeResult } = renderHook(() => useAppStore());
    act(() => {
      storeResult.current.login('a@a.com', 'A');
    });
    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(true);
  });
});
