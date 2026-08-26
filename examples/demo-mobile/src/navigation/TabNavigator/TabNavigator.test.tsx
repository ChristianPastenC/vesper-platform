import React from 'react';
import { Text as MockText } from 'react-native';
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
jest.mock('../../features/scan-and-go/views/ScannerScreen', () => ({
  ScannerScreen: () => null,
}));
jest.mock('../../features/profile/views/ProfileScreen', () => ({
  ProfileScreen: () => null,
}));
jest.mock('../../features/home/views/HomeScreen', () => ({
  HomeScreen: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 20,
    bottom: 20,
    left: 0,
    right: 0,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({
      children,
      screenOptions,
    }: {
      children: React.ReactNode;
      screenOptions?: (props: { route: { name: string } }) => unknown;
    }) => {
      if (typeof screenOptions === 'function') {
        const optionsObj = screenOptions({ route: { name: 'CatalogTab' } }) as unknown as {
          tabBarIcon: (props: { focused: boolean; color: string; size: number }) => void;
        };
        if (optionsObj && optionsObj.tabBarIcon) {
          optionsObj.tabBarIcon({ focused: true, color: 'red', size: 24 });
        }
      }
      return <>{children}</>;
    },
    Screen: ({ options }: { options?: { title?: string } }) => {
      return <MockText>{options?.title || ''}</MockText>;
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
    const { getByText, queryByText } = render(<TabNavigator />);

    expect(getByText('home.tabTitle')).toBeTruthy();
    expect(getByText('catalog.title')).toBeTruthy();
    expect(queryByText('online_checkout.cartTitle')).toBeNull();
    expect(getByText('scan_and_go.title')).toBeTruthy();
    expect(getByText('profile.tabTitle')).toBeTruthy();
  });
});
