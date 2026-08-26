import { useTranslation } from 'react-i18next';

export const useStoreCard = () => {
  const { t } = useTranslation();

  return { t };
};
