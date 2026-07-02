import React from 'react';
import { View, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { Button } from '../../../../components/Button';
import { useRegisterForm } from './useRegisterForm';
import { stylesFactory } from './RegisterForm.styles';

export const RegisterForm: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const {
    username,
    setUsername,
    email,
    setEmail,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    password,
    setPassword,
    error,
    isPending,
    handleRegister,
    t,
  } = useRegisterForm();

  return (
    <ScrollView testID="register-form" showsVerticalScrollIndicator={false}>
      {error ? (
        <View style={styles.errorContainer} testID="register-error-banner">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text variant="bold" style={styles.label}>
          {t('auth.usernameLabel', 'Username')}
        </Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder={t('auth.usernamePlaceholder', 'Enter your username')}
          placeholderTextColor={theme.colors.text + '50'}
          autoCapitalize="none"
          editable={!isPending}
          testID="username-input"
        />
      </View>

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
          {t('auth.firstNameLabel', 'First Name')}
        </Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder={t('auth.firstNamePlaceholder', 'Enter your first name')}
          placeholderTextColor={theme.colors.text + '50'}
          editable={!isPending}
          testID="firstname-input"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text variant="bold" style={styles.label}>
          {t('auth.lastNameLabel', 'Last Name')}
        </Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder={t('auth.lastNamePlaceholder', 'Enter your last name')}
          placeholderTextColor={theme.colors.text + '50'}
          editable={!isPending}
          testID="lastname-input"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text variant="bold" style={styles.label}>
          {t('auth.phoneLabel', 'Phone Number')}
        </Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('auth.phonePlaceholder', 'Enter your phone number')}
          placeholderTextColor={theme.colors.text + '50'}
          keyboardType="phone-pad"
          editable={!isPending}
          testID="phone-input"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text variant="bold" style={styles.label}>
          {t('auth.passwordLabel', 'Password')}
        </Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
          placeholderTextColor={theme.colors.text + '50'}
          secureTextEntry
          autoCapitalize="none"
          editable={!isPending}
          testID="password-input"
        />
      </View>

      <Button
        title={t('auth.registerSubmitButton', 'Sign Up')}
        status={isPending ? 'loading' : 'idle'}
        onPress={handleRegister}
        style={styles.registerBtn}
        testID="register-submit-button"
      />
    </ScrollView>
  );
};
