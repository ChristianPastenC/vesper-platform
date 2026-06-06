import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from './src/providers/AppProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}