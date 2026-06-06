import React from 'react';
import { render } from '@testing-library/react-native';
import { TabNavigator } from './TabNavigator';
import { useTabNavigator } from './useTabNavigator';

jest.mock('./useTabNavigator', () => ({
  useTabNavigator: jest.fn(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../features/catalog/views/CatalogScreen', () => ({
  CatalogScreen: () => null,
}));
jest.mock('../../features/online-shopping/views/OnlineCartScreen', () => ({
  OnlineCartScreen: () => null,
}));
jest.mock('../../features/scan-and-go/views/ScannerScreen', () => ({
  ScannerScreen: () => null,
}));
jest.mock('../../features/profile/views/ProfileScreen', () => ({
  ProfileScreen: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children, screenOptions }: any) => {
      if (typeof screenOptions === 'function') {
        screenOptions({ route: { name: 'CatalogTab' } });
      }
      return <>{children}</>;
    },
    Screen: ({ options }: any) => {
      const React = require('react');
      const { Text } = require('react-native');
      return <Text>{options?.title || ''}</Text>;
    },
  }),
}));

describe('TabNavigator Component', () => {
  beforeEach(() => {
    (useTabNavigator as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      colors: {
        surface: '#FFFFFF',
        border: '#E0E0E0',
        primary: '#6200EE',
        text: '#121212',
      },
      getTabBarIconName: () => 'grid-outline',
    });
  });

  it('renders tab titles correctly', () => {
    const { getByText } = render(<TabNavigator />);

    expect(getByText('catalog.title')).toBeTruthy();
    expect(getByText('online_checkout.cartTitle')).toBeTruthy();
    expect(getByText('scan_and_go.title')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
  });
});
