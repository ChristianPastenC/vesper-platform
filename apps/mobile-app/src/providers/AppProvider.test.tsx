import React from 'react';
import { render } from '@testing-library/react-native';
import { AppProvider } from './AppProvider';
import { Text } from 'react-native';

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../core/i18n/i18n', () => ({
  changeLanguage: jest.fn(),
  t: (k: string) => k,
}));

jest.mock('../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000000',
      background: '#FFFFFF',
    },
    isDarkMode: false,
  }),
}));

jest.mock('../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('./useSovereignInitializer', () => ({
  useSovereignInitializer: jest.fn(),
}));

jest.mock('../core/network/networkResolver', () => ({
  startNetworkTransitionsListener: jest.fn(),
  stopNetworkTransitionsListener: jest.fn(),
}));

jest.mock('../core/network/handshakeValidator', () => ({
  validateHandshake: jest.fn(),
}));

import { useAppStore } from '../store/useAppStore';
import { useSovereignInitializer } from './useSovereignInitializer';

describe('AppProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when not bootstrapped', () => {
    (useAppStore as jest.Mock).mockImplementation((selector) => {
      const state = { language: 'en', isFrozen: false };
      return selector(state);
    });
    (useSovereignInitializer as jest.Mock).mockReturnValue({
      client: null,
      isBootstrapped: false,
      dpopPublicKey: null,
    });

    const { getByTestId } = render(
      <AppProvider>
        <Text testID="child">Child</Text>
      </AppProvider>,
    );

    // Should render ActivityIndicator, child should not be visible
    expect(() => getByTestId('child')).toThrow();
  });

  it('renders children when bootstrapped', () => {
    (useAppStore as jest.Mock).mockImplementation((selector) => {
      const state = { language: 'en', isFrozen: false };
      return selector(state);
    });
    (useSovereignInitializer as jest.Mock).mockReturnValue({
      client: {},
      isBootstrapped: true,
      dpopPublicKey: 'mockedKey',
    });

    const { getByTestId } = render(
      <AppProvider>
        <Text testID="child">Child Content</Text>
      </AppProvider>,
    );

    expect(getByTestId('child')).toBeTruthy();
  });

  it('renders frozen warning when isFrozen is true', () => {
    (useAppStore as jest.Mock).mockImplementation((selector) => {
      const state = { language: 'en', isFrozen: true };
      return selector(state);
    });
    (useSovereignInitializer as jest.Mock).mockReturnValue({
      client: {},
      isBootstrapped: true,
      dpopPublicKey: 'mockedKey',
    });

    const { getByText } = render(
      <AppProvider>
        <Text testID="child">Child Content</Text>
      </AppProvider>,
    );

    expect(getByText('system.pendingTransaction')).toBeTruthy();
  });
});
