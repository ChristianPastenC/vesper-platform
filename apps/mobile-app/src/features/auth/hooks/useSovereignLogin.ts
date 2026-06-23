import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { saveTokens } from '../../../core/auth/tokenStore';
import { encodeJsonBody, SovereignAdapterRequest } from '@sovereign/secure-client';
import { randomUUID } from 'expo-crypto';

import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/SovereignClientContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const useSovereignLogin = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const client = useSovereignClient();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!username || !password) {
      setError(t('auth.invalidError'));
      return;
    }

    try {
      setIsPending(true);

      const request: SovereignAdapterRequest = {
        method: 'POST',
        url: `${API_URL}/api/v1/auth/login`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: encodeJsonBody({ username, password }),
      };

      const requestId = randomUUID();
      
      const response = await client.executeRequest<AuthResponse>(requestId, request);
      
      await saveTokens(response.accessToken, response.refreshToken);

      useAppStore.getState().setIsAuthenticated(true, response.user.username);
      
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err: any) {
      setError(err.message || t('auth.invalidError'));
    } finally {
      setIsPending(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    error,
    isPending,
    handleLogin,
    t,
  };
};
