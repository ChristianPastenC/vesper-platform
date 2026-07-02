import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { saveTokens } from '../../../core/auth/tokenStore';
import { encodeJsonBody } from '@sovereign/secure-client';
import { randomUUID } from 'react-native-quick-crypto';

import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/sovereign/SovereignClientContext';
import { getApiUrl } from '../../../core/config';
import { AuthResponse } from './useSovereignLogin';

export const useSovereignRegister = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const client = useSovereignClient();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!username || !email) {
      setError(t('auth.emptyFieldsError', 'Username and email are required.'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('auth.invalidEmailError', 'Invalid email format.'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.shortPasswordError', 'Password must be at least 8 characters long.'));
      return;
    }

    try {
      const API_URL = getApiUrl();
      setIsPending(true);

      const bodyBytes = encodeJsonBody({
        username,
        email,
        firstName,
        lastName,
        phone,
        password,
      });

      const response = await client.executeRequest<AuthResponse>(randomUUID(), {
        method: 'POST',
        url: `${API_URL}/api/v1/auth/register`,
        body: bodyBytes,
        headers: { 'Content-Type': 'application/json' },
      });

      await saveTokens(response.accessToken, response.refreshToken);
      useAppStore.getState().setIsAuthenticated(true, response.user.username);

      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || t('auth.invalidError', 'Registration failed.'));
    } finally {
      setIsPending(false);
    }
  };

  return {
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
  };
};
