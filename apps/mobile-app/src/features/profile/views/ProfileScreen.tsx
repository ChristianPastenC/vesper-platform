import React from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '../../../core/theme/useTheme';
import { useProfile } from '../hooks/useProfile';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { stylesFactory } from './ProfileScreen.styles';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const {
    isAuthenticated,
    userName,
    mode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    isPending,
    toggleMode,
    handleAuthSubmit,
    handleLogout,
    t,
  } = useProfile();

  if (isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text variant="title" style={styles.title}>
            Session Active
          </Text>
          <Text variant="body" style={styles.sessionText}>
            Welcome, {userName || 'User'}! You are successfully authenticated. Enjoy
            retail experiences.
          </Text>
          <Button
            title={t('auth.logoutButton') || 'Sign Out'}
            variant="danger"
            onPress={handleLogout}
            style={styles.actionBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text variant="title" style={styles.title}>
          {mode === 'login' ? t('auth.title') : 'Create Account'}
        </Text>
        <Text variant="caption" style={styles.subtitle}>
          {mode === 'login'
            ? t('auth.subtitle')
            : 'Register to unlock shipping and store checkouts'}
        </Text>

        {error && (
          <View style={styles.errorContainer} testID="profile-error-banner">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text variant="bold" style={styles.label}>
            {t('auth.nameLabel')}
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('auth.namePlaceholder')}
            placeholderTextColor={theme.colors.text + '50'}
            autoCapitalize="words"
            editable={!isPending}
            testID="profile-name-input"
          />
        </View>

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
            testID="profile-email-input"
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
            testID="profile-password-input"
          />
        </View>

        {mode === 'signup' && (
          <View style={styles.inputGroup}>
            <Text variant="bold" style={styles.label}>
              Confirm Password
            </Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={theme.colors.text + '50'}
              secureTextEntry
              autoCapitalize="none"
              editable={!isPending}
              testID="profile-confirm-password-input"
            />
          </View>
        )}

        <Button
          title={mode === 'login' ? t('auth.loginButton') : 'Sign Up'}
          status={isPending ? 'loading' : 'idle'}
          onPress={handleAuthSubmit}
          style={styles.actionBtn}
          testID="profile-submit-button"
        />

        <Button
          title={
            mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign In'
          }
          variant="secondary"
          disabled={isPending}
          onPress={toggleMode}
          style={styles.toggleBtn}
        />
      </View>
    </View>
  );
};
