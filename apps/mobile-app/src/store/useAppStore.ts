import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../core/i18n/i18n';

export interface OnlineCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface InStoreCartItem {
  id: string;
  barcode: string;
  name: string;
  price: number;
  quantity: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'en' | 'es';

interface AppState {
  isAuthenticated: boolean;
  userName: string | null;
  isOnline: boolean;
  language: Language;
  themeMode: ThemeMode;
  onlineCart: OnlineCartItem[];
  inStoreCart: InStoreCartItem[];

  login: (email: string, name: string) => Promise<void>;
  signUp: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  toggleNetwork: () => void;
  setLanguage: (lang: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;

  // Online Flow
  addToOnlineCart: (item: Omit<OnlineCartItem, 'quantity'>) => void;
  clearOnlineCart: () => void;
  getOnlineTotal: () => number;

  // In-Store Flow
  addToInStoreCart: (item: Omit<InStoreCartItem, 'quantity'>) => void;
  clearInStoreCart: () => void;
  getInStoreTotal: () => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userName: null,
      isOnline: true,
      language: 'en',
      themeMode: 'system',
      onlineCart: [],
      inStoreCart: [],

      login: async (_email, name) => {
        set({ isAuthenticated: true, userName: name || 'User' });
      },
      signUp: async (_email, name) => {
        set({ isAuthenticated: true, userName: name || 'User' });
      },
      logout: async () => {
        const { clearTokens } = await import('../core/auth/tokenStore');
        await clearTokens();
        set({
          isAuthenticated: false,
          userName: null,
          onlineCart: [],
          inStoreCart: [],
        });
      },
      initAuth: async () => {
        const { getAccessToken } = await import('../core/auth/tokenStore');
        const token = await getAccessToken();
        set({ isAuthenticated: !!token });
      },
      toggleNetwork: () => set((state) => ({ isOnline: !state.isOnline })),
      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
      setThemeMode: (mode) => set({ themeMode: mode }),

      addToOnlineCart: (item) =>
        set((state) => {
          const existing = state.onlineCart.find((i) => i.id === item.id);
          if (existing) {
            return {
              onlineCart: state.onlineCart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return { onlineCart: [...state.onlineCart, { ...item, quantity: 1 }] };
        }),

      clearOnlineCart: () => set({ onlineCart: [] }),
      getOnlineTotal: () => {
        return get().onlineCart.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      addToInStoreCart: (item) =>
        set((state) => {
          const existing = state.inStoreCart.find((i) => i.id === item.id);
          if (existing) {
            return {
              inStoreCart: state.inStoreCart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return { inStoreCart: [...state.inStoreCart, { ...item, quantity: 1 }] };
        }),

      clearInStoreCart: () => set({ inStoreCart: [] }),
      getInStoreTotal: () => {
        return get().inStoreCart.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'sovereign-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        themeMode: state.themeMode,
        onlineCart: state.onlineCart,
        inStoreCart: state.inStoreCart,
      }),
    },
  ),
);

export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);

