import React from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { Button } from '../../../../components/Button';
import { useLoginForm } from './useLoginForm';
import { stylesFactory } from './LoginForm.styles';

export const LoginForm: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { email, setEmail, password, setPassword, error, isPending, handleLogin, t } =
    useLoginForm();

  return (
    <View testID="login-form">
      {error ? (
        <View style={styles.errorContainer} testID="login-error-banner">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text variant="bold" style={styles.label}>
          {t('auth.emailLabel', 'Email')}
        </Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder', 'Enter your email')}
          placeholderTextColor={theme.colors.text + '50'}
          autoCapitalize="none"
          keyboardType="email-address"
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
  );
};
