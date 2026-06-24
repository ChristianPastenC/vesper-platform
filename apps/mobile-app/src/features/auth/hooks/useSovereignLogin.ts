import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { saveTokens } from '../../../core/auth/tokenStore';
import { encodeJsonBody } from '@sovereign/secure-client';
import { randomUUID } from 'expo-crypto';

import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/SovereignClientContext';

// 1. Leer API_URL desde ../../../core/config
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

  // 2. Declarar estados locales
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleLogin = async () => {
    setError(null);

    // a. Validar que name, email y password no estén vacíos
    if (!name || !email || !password) {
      setError(t('auth.emptyFieldsError', 'All fields are required.'));
      return;
    }

    // b. Validar formato de email con regex y password.length >= 4
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

      // c. Serializar credenciales
      const bodyBytes = encodeJsonBody({ username: email, password });

      // d. Llamar executeRequest
      const response = await client.executeRequest<AuthResponse>(randomUUID(), {
        method: 'POST',
        url: `${API_URL}/api/v1/auth/login`,
        body: bodyBytes,
        headers: { 'Content-Type': 'application/json' },
      });

      // e. En éxito: guardar tokens y actualizar estado
      await saveTokens(response.accessToken, response.refreshToken);
      useAppStore.getState().setIsAuthenticated(true, response.user.username);

      // g. Si canGoBack, goBack
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err: any) {
      // f. En error: mapear el mensaje
      setError(err.message || t('auth.invalidError', 'Login failed.'));
    } finally {
      setIsPending(false);
    }
  };

  // 6. Retornar
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
