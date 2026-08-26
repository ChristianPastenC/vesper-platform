import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { saveTokens } from '../../../core/auth/tokenStore';
import { encodeJsonBody } from '@sovereign/secure-client';
import { randomUUID } from 'react-native-quick-crypto';

import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/sovereign/SovereignClientContext';

// 1. Read API_URL from ../../../core/config
import { getApiUrl } from '../../../core/config';

export interface AuthResponse {
  user: { id: string; username: string; email: string };
  accessToken: string;
  refreshToken: string;
}

export const useSovereignLogin = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const client = useSovereignClient();

  // 2. Declare local states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleLogin = async () => {
    setError(null);

    // a. Validate that name, email and password are not empty
    if (!email || !password) {
      setError(t('auth.emptyFieldsError', 'All fields are required.'));
      return;
    }

    // b. Validate email format with regex and password.length >= 4
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('auth.invalidEmailError', 'Invalid email format.'));
      return;
    }

    if (password.length < 4) {
      setError(t('auth.shortPasswordError', 'Password must be at least 4 characters long.'));
      return;
    }

    try {
      const API_URL = getApiUrl();
      setIsPending(true);

      // c. Serialize credentials
      const bodyBytes = encodeJsonBody({ username: email, password });

      // d. Call executeRequest
      const response = await client.executeRequest<AuthResponse>(randomUUID(), {
        method: 'POST',
        url: `${API_URL}/api/v1/auth/login`,
        body: bodyBytes,
        headers: { 'Content-Type': 'application/json' },
      });

      // e. On success: save tokens and update state
      await saveTokens(response.accessToken, response.refreshToken);
      useAppStore.getState().setIsAuthenticated(true, response.user.username);

      // g. If canGoBack, goBack
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: unknown) {
      // f. On error: map the message
      const err = error as { message?: string };
      setError(err.message || t('auth.invalidError', 'Login failed.'));
    } finally {
      setIsPending(false);
    }
  };

  // 6. Return
  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    error,
    isPending,
    handleLogin,
    t,
  };
};
