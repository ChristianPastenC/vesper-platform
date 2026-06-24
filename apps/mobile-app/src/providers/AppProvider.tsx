import React, { createContext, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '../core/i18n/i18n';
import { useTheme } from '../core/theme/useTheme';
import { ThemeColors } from '../core/theme/colors';
import { useAppStore } from '../store/useAppStore';

import { useSovereignInitializer } from './useSovereignInitializer';
import { SovereignClientContext } from './SovereignClientContext';
import { createAppProviderStyles } from './AppProvider.styles';
import { validateHandshake } from '../core/network/handshakeValidator';
import {
  startNetworkTransitionsListener,
  stopNetworkTransitionsListener,
} from '../core/network/networkResolver';

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

// Context is imported from SovereignClientContext.ts

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Logic
  const theme = useTheme();
  const language = useAppStore((state) => state.language);
  const { client, isBootstrapped, dpopPublicKey } = useSovereignInitializer();

  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Network listener to process synchronized queue upon reconnection
  useEffect(() => {
    if (!client) return;

    // (1) Call handshakeValidator to validate the channel
    // (2) Replay the queue in FIFO order (handled natively by startNetworkTransitionsListener)
    // (3) Invoke observers.onSessionResume to update the UI
    startNetworkTransitionsListener(client, validateHandshake);

    return () => {
      stopNetworkTransitionsListener();
    };
  }, [client]);

  // Styles
  const styles = createAppProviderStyles(theme.colors);

  // Global Store state
  const isFrozen = useAppStore((state) => state.isFrozen);

  // Render blocking state
  if (!isBootstrapped) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Main Render
  return (
    <SafeAreaProvider>
      <SovereignClientContext.Provider value={{ client, dpopPublicKey }}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ThemeContext.Provider value={theme}>
              {isFrozen && (
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    padding: 12,
                    paddingTop: 40,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                    {i18n.t('system.pendingTransaction') ||
                      'Transacción pendiente de sincronización...'}
                  </Text>
                </View>
              )}
              {children}
            </ThemeContext.Provider>
          </I18nextProvider>
        </QueryClientProvider>
      </SovereignClientContext.Provider>
    </SafeAreaProvider>
  );
};
