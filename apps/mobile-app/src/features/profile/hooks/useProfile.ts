import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';

export const useProfile = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const userName = useAppStore((state) => state.userName);
  const loginAction = useAppStore((state) => state.login);
  const signUpAction = useAppStore((state) => state.signUp);
  const logoutAction = useAppStore((state) => state.logout);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleAuthSubmit = async () => {
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

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsPending(true);
      if (mode === 'login') {
        await loginAction(email, name);
      } else {
        await signUpAction(email, name);
      }
    } catch (err) {
      setError(t('auth.invalidError'));
    } finally {
      setIsPending(false);
    }
  };

  const handleLogout = () => {
    logoutAction();
  };

  return {
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
  };
};
