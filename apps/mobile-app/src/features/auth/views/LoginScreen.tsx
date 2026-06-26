import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../core/theme/useTheme';
import { AuthHero } from '../components/AuthHero/AuthHero';
import { LoginForm } from '../components/LoginForm/LoginForm';
import { stylesFactory } from './LoginScreen.styles';

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AuthHero />
        <LoginForm />
      </View>
    </View>
  );
};
