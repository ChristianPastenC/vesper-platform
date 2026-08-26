import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { LoginScreen } from '../features/auth/views/LoginScreen';
import { RegisterScreen } from '../features/auth/views/RegisterScreen';
import { ProductListScreen } from '../features/catalog/views/ProductListScreen';
import { ProductDetailsScreen } from '../features/catalog/views/ProductDetailsScreen';
import { OnlineCartScreen } from '../features/online-shopping/views/OnlineCartScreen';
import { OnlineCheckoutModal } from '../features/online-shopping/views/OnlineCheckoutModal';
import { InStoreCheckoutScreen } from '../features/scan-and-go/views/InStoreCheckoutScreen';
import { PaymentSuccessScreen } from '../features/payment/views/PaymentSuccessScreen';
import { StoresScreen } from '../features/stores/views/StoresScreen';
import { OrdersScreen } from '../features/orders/views/OrdersScreen/OrdersScreen';
import { OrderDetailsScreen } from '../features/orders/views/OrderDetailsScreen/OrderDetailsScreen';
import { useTheme } from '../core/theme/useTheme';

import { useTranslation } from 'react-i18next';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: colors.text,
        cardStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          presentation: 'modal',
          title: t('auth.loginButton'),
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          presentation: 'modal',
          title: t('auth.registerButton', 'Register'),
        }}
      />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen
        name="OnlineCart"
        component={OnlineCartScreen}
        options={{
          title: t('online_checkout.cartTitle'),
        }}
      />
      <Stack.Screen
        name="OnlineCheckoutModal"
        component={OnlineCheckoutModal}
        options={{
          presentation: 'modal',
          title: t('online_checkout.title'),
        }}
      />
      <Stack.Screen
        name="InStoreCheckoutModal"
        component={InStoreCheckoutScreen}
        options={{
          presentation: 'modal',
          title: t('scan_and_go.checkoutTitle'),
        }}
      />
      <Stack.Screen
        name="PaymentSuccessScreen"
        component={PaymentSuccessScreen}
        options={{
          headerLeft: () => null,
          title: t('orders.statusTitle'),
        }}
      />
      <Stack.Screen
        name="Stores"
        component={StoresScreen}
        options={{
          title: t('stores.title'),
        }}
      />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: t('orders.title'),
        }}
      />
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{
          title: t('orders.detailsTitle'),
        }}
      />
    </Stack.Navigator>
  );
};
