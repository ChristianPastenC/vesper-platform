import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';

export interface UserProfileData {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export const useProfile = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const logoutAction = useAppStore((state) => state.logout);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const { execute } = useAuthenticatedRequest();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchProfile = async () => {
        setIsLoading(true);
        try {
          const data = await execute<UserProfileData>('fetch-profile', {
            method: 'GET',
            path: '/api/v1/profile/me',
          });
          setProfileData(data);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else {
      setProfileData(null);
    }
  }, [isAuthenticated, execute]);

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

  const userName = profileData ? `${profileData.firstName} ${profileData.lastName}` : null;

  return {
    isAuthenticated,
    userName,
    profileData,
    isLoading,
    error,
    themeMode,
    toggleThemeMode,
    language,
    toggleLanguage,
    handleLogout,
    t,
  };
};
