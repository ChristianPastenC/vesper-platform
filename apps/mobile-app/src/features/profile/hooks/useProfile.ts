import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';

export const useProfile = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const userName = useAppStore((state) => state.userName);
  const logoutAction = useAppStore((state) => state.logout);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const toggleThemeMode = () => {
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  const handleLogout = () => {
    logoutAction();
  };

  return {
    isAuthenticated,
    userName,
    themeMode,
    toggleThemeMode,
    language,
    toggleLanguage,
    handleLogout,
    t,
  };
};
