import 'react-native-gesture-handler/jestSetup';
import React from 'react';
import { render } from '@testing-library/react-native';
import { AppNavigator } from './AppNavigator';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock dependencies
jest.mock('../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      surface: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      background: '#F8FAFC',
    },
    isDarkMode: false,
  }),
}));

jest.mock('./TabNavigator', () => ({
  TabNavigator: () => null,
}));

// Mock screens to avoid complex dependency trees
jest.mock('../features/auth/views/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('../features/catalog/views/ProductDetailsScreen', () => ({
  ProductDetailsScreen: () => null,
}));
jest.mock('../features/online-shopping/views/OnlineCartScreen', () => ({
  OnlineCartScreen: () => null,
}));
jest.mock('../features/online-shopping/views/OnlineCheckoutModal', () => ({
  OnlineCheckoutModal: () => null,
}));
jest.mock('../features/scan-and-go/views/InStoreCheckoutScreen', () => ({
  InStoreCheckoutScreen: () => null,
}));
jest.mock('../features/payment/views/PaymentSuccessScreen', () => ({
  PaymentSuccessScreen: () => null,
}));

describe('AppNavigator', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders PaymentSuccessScreen options correctly', () => {
    // Call AppNavigator as a function to inspect its returned JSX tree
    const element = AppNavigator({});
    const children = element.props.children;
    // Find the PaymentSuccessScreen
    const successScreen = (Array.isArray(children) ? children : []).find(
      (child: React.ReactElement) =>
        child && child.props && child.props.name === 'PaymentSuccessScreen',
    );

    expect(successScreen).toBeDefined();
    if (successScreen?.props?.options?.headerLeft) {
      expect(successScreen.props.options.headerLeft()).toBeNull();
    }
  });
});
