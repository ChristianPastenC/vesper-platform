import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../core/i18n/i18n';
import { clearTokens, getAccessToken } from '../core/auth/tokenStore';

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
  isFrozen: boolean;
  language: Language;
  themeMode: ThemeMode;
  onlineCart: OnlineCartItem[];
  inStoreCart: InStoreCartItem[];

  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  setIsAuthenticated: (auth: boolean, username?: string) => void;
  toggleNetwork: () => void;
  setFrozen: (frozen: boolean) => void;
  setLanguage: (lang: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;

  // Online Flow
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
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
      isFrozen: false,
      language: 'en',
      themeMode: 'system',
      deliveryAddress: '',
      setDeliveryAddress: (address) => set({ deliveryAddress: address }),
      onlineCart: [],
      inStoreCart: [],


      logout: async () => {
        await clearTokens();
        set({
          isAuthenticated: false,
          userName: null,
          onlineCart: [],
          inStoreCart: [],
        });
      },
      initAuth: async () => {
        const token = await getAccessToken();
        set({ isAuthenticated: !!token });
      },
      setIsAuthenticated: (auth, username) =>
        set({ isAuthenticated: auth, userName: username || null }),
      toggleNetwork: () => set((state) => ({ isOnline: !state.isOnline })),
      setFrozen: (frozen) => set({ isFrozen: frozen }),
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
        // ONLY persist UX configurations (language, themeMode) and User Address
        // Transactional and Auth payloads (cart, tokens, isAuth) are NOT persisted.
        language: state.language,
        themeMode: state.themeMode,
        deliveryAddress: state.deliveryAddress,
      }),
    },
  ),
);

export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
