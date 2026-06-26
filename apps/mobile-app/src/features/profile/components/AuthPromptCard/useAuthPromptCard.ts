import { useTranslation } from 'react-i18next';
import { useProfile } from '../../hooks/useProfile';
import { useNavigation, NavigationProp } from '@react-navigation/native';

export const useAuthPromptCard = () => {
  const { isAuthenticated, handleLogout } = useProfile();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();

  const onSignIn = () => {
    navigation.navigate('Login');
  };

  return {
    isAuthenticated,
    handleLogout,
    onSignIn,
    t,
  };
};
