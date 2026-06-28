import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';
import { LoginScreen } from '../features/auth/views/LoginScreen';
import { ProductListScreen } from '../features/catalog/views/ProductListScreen';
import { ProductDetailsScreen } from '../features/catalog/views/ProductDetailsScreen';
import { OnlineCartScreen } from '../features/online-shopping/views/OnlineCartScreen';
import { OnlineCheckoutModal } from '../features/online-shopping/views/OnlineCheckoutModal';
import { InStoreCheckoutScreen } from '../features/scan-and-go/views/InStoreCheckoutScreen';
import { PaymentSuccessScreen } from '../features/payment/views/PaymentSuccessScreen';
import { StoresScreen } from '../features/stores/views/StoresScreen';
import { useTheme } from '../core/theme/useTheme';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { colors } = useTheme();

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
          title: 'Sign In',
        }}
      />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen
        name="OnlineCart"
        component={OnlineCartScreen}
        options={{
          title: 'Online Cart',
        }}
      />
      <Stack.Screen
        name="OnlineCheckoutModal"
        component={OnlineCheckoutModal}
        options={{
          presentation: 'modal',
          title: 'Online Checkout',
        }}
      />
      <Stack.Screen
        name="InStoreCheckoutModal"
        component={InStoreCheckoutScreen}
        options={{
          presentation: 'modal',
          title: 'Store Checkout',
        }}
      />
      <Stack.Screen
        name="PaymentSuccessScreen"
        component={PaymentSuccessScreen}
        options={{
          headerLeft: () => null,
          title: 'Order Status',
        }}
      />
      <Stack.Screen
        name="Stores"
        component={StoresScreen}
        options={{
          title: 'Stores',
        }}
      />
    </Stack.Navigator>
  );
};
