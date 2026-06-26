import { useTranslation } from 'react-i18next';
import { useSovereignLogin } from '../../hooks/useSovereignLogin';

export const useLoginForm = () => {
  const { t } = useTranslation();
  const loginState = useSovereignLogin();

  return {
    ...loginState,
    t,
  };
};
