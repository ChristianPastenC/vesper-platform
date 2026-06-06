import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';

export const useLogin = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const loginAction = useAppStore((state) => state.login);

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
