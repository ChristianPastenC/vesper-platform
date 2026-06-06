import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../core/theme/useTheme';
import { TabParamList } from './types';
import { CatalogScreen } from '../features/catalog/views/CatalogScreen';
import { OnlineCartScreen } from '../features/online-shopping/views/OnlineCartScreen';
import { ScannerScreen } from '../features/scan-and-go/views/ScannerScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text + '80', // 50% opacity
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      }}
    >
      <Tab.Screen
        name="CatalogTab"
        component={CatalogScreen}
        options={{
          title: t('catalog.title'),
        }}
      />
      <Tab.Screen
        name="OnlineCartTab"
        component={OnlineCartScreen}
        options={{
          title: t('online_checkout.cartTitle'),
        }}
      />
      <Tab.Screen
        name="ScanAndGoTab"
        component={ScannerScreen}
        options={{
          title: t('scan_and_go.title'),
        }}
      />
    </Tab.Navigator>
  );
};
