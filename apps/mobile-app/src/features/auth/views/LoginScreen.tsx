import React from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '../../../core/theme/useTheme';
import { useLogin } from '../hooks/useLogin';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { stylesFactory } from './LoginScreen.styles';

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isPending,
    handleLogin,
    t,
  } = useLogin();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text variant="title" style={styles.title}>
          {t('auth.title')}
        </Text>
        <Text variant="caption" style={styles.subtitle}>
          {t('auth.subtitle')}
        </Text>

        {error && (
          <View style={styles.errorContainer} testID="login-error-banner">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text variant="bold" style={styles.label}>
            {t('auth.emailLabel')}
          </Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={theme.colors.text + '50'}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isPending}
            testID="email-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text variant="bold" style={styles.label}>
            {t('auth.passwordLabel')}
          </Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={theme.colors.text + '50'}
            secureTextEntry
            autoCapitalize="none"
            editable={!isPending}
            testID="password-input"
          />
        </View>

        <Button
          title={t('auth.loginButton')}
          status={isPending ? 'loading' : 'idle'}
          onPress={handleLogin}
          style={styles.loginBtn}
          testID="login-submit-button"
        />
      </View>
    </View>
  );
};
