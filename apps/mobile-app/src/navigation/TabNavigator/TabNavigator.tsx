import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TabParamList } from '../types';
import { CatalogScreen } from '../../features/catalog/views/CatalogScreen';
import { ScannerScreen } from '../../features/scan-and-go/views/ScannerScreen';
import { ProfileScreen } from '../../features/profile/views/ProfileScreen';
import { HomeScreen } from '../../features/home/views/HomeScreen';
import { useTheme } from '../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabNavigator } from './useTabNavigator';
import { stylesFactory } from './TabNavigator.styles';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const { t, colors, getTabBarIconName } = useTabNavigator();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(colors, insets);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: styles.activeTintColor,
        tabBarInactiveTintColor: styles.inactiveTintColor,
        tabBarStyle: styles.tabBarStyle,
        headerStyle: styles.headerStyle,
        headerTintColor: styles.headerTintColor,
        tabBarIcon: ({ color, size }) => {
          const iconName = getTabBarIconName(route.name);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogScreen}
        options={{
          title: t('catalog.title'),
        }}
      />
      <Tab.Screen
        name="ScanAndGoTab"
        component={ScannerScreen}
        options={{
          title: t('scan_and_go.title'),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Account',
        }}
      />
    </Tab.Navigator>
  );
};
