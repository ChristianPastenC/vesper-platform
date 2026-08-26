import { useTranslation } from 'react-i18next';

export const useAuthHero = () => {
  const { t } = useTranslation();

  return {
    title: t('auth.title'),
    subtitle: t('auth.subtitle'),
  };
};
