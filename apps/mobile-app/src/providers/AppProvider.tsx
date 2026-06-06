import React, { createContext, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from '../core/i18n/i18n';
import { useTheme } from '../core/theme/useTheme';
import { ThemeColors } from '../core/theme/colors';
import { useAppStore } from '../store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

export interface ThemeContextType {
  colors: ThemeColors;
  isDarkMode: boolean;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useTheme();
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
        </I18nextProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};
