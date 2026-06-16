import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { saveTokens } from '../../../core/auth/tokenStore';
import { encodeJsonBody, SovereignAdapterRequest } from '@sovereign/secure-client';

import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/SovereignClientContext';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export const useSovereignLogin = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const loginAction = useAppStore((state) => state.login);
  const client = useSovereignClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!name || !email || !password) {
      setError(t('auth.invalidError'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || password.length < 4) {
      setError(t('auth.invalidError'));
      return;
    }

    try {
      setIsPending(true);

      const request: SovereignAdapterRequest = {
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'Content-Type': 'application/json',
        },
        body: encodeJsonBody({ username: email, password }),
      };

      const requestId = 'login-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2);
      
      const response = await client.executeRequest<AuthResponse>(requestId, request);
      
      await saveTokens(response.accessToken || '', response.refreshToken || '');

      await loginAction(email, name);
      
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err) {
      setError(t('auth.invalidError'));
    } finally {
      setIsPending(false);
    }
  };

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
