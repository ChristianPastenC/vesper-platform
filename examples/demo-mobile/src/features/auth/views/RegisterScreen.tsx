import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../core/theme/useTheme';
import { AuthHero } from '../components/AuthHero/AuthHero';
import { RegisterForm } from '../components/RegisterForm/RegisterForm';
import { stylesFactory } from './RegisterScreen.styles';

export const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AuthHero />
        <RegisterForm />
      </View>
    </View>
  );
};
