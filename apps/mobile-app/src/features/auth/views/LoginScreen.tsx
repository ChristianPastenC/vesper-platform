import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { useTranslation } from 'react-i18next';
import { Text } from '../../../components/Text';
import { useTheme } from '../../../core/theme/useTheme';
import { AuthHero } from '../components/AuthHero/AuthHero';
import { LoginForm } from '../components/LoginForm/LoginForm';
import { stylesFactory } from './LoginScreen.styles';

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AuthHero />
        <LoginForm />
        <TouchableOpacity
          style={{ marginTop: 24, alignItems: 'center' }}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '500' }}>
            {t('auth.noAccount', '¿No tienes cuenta? Regístrate')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
