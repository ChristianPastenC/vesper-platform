import { useTranslation } from 'react-i18next';
import { useProfile } from '../../hooks/useProfile';

export const useProfileHeader = () => {
  const { isAuthenticated, userName, profileData } = useProfile();
  const { t } = useTranslation();

  const getInitial = () => (userName ? userName.charAt(0).toUpperCase() : '');

  return {
    isAuthenticated,
    userName,
    avatar: profileData?.avatar,
    initial: getInitial(),
    t,
  };
};
