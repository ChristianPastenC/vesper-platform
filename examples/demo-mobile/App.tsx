import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './src/providers/app/AppProvider';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useTheme } from './src/core/theme/useTheme';

// All of these are the app's own console.error(...) calls for backend/network
// failures (grep the codebase for these exact tags), and every one of them
// fires on a cold start whenever there's no real backend configured -- the
// default for local dev and for the Frida DAST pipeline in CI, which never
// stands up a mock server. They're expected noise, not bugs. Left
// unsuppressed, RN's LogBox notification banner renders on top of the bottom
// tab bar, which silently breaks UI automation (taps landing on the banner
// instead of the tab underneath it) as well as normal manual use of the app
// without a backend.
LogBox.ignoreLogs([
  '[NetworkResolver]',
  '[HandshakeValidator]',
  '[useSovereignInitializer]',
  '[SovereignCheckout]',
  '[PaymentClearing]',
]);

const MainApp = () => {
  const { colors, isDarkMode } = useTheme();

  const theme = {
    dark: isDarkMode,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <AppNavigator />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;
