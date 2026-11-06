import { useTranslation } from 'react-i18next';
import { useVesperLogin } from '../../hooks/useVesperLogin';

export const useLoginForm = () => {
  const { t } = useTranslation();
  const loginState = useVesperLogin();

  return {
    ...loginState,
    t,
  };
};
