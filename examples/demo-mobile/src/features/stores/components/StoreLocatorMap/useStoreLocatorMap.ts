import { useTranslation } from 'react-i18next';
import { useStores } from '../../hooks/useStores';

export const useStoreLocatorMap = () => {
  const { t } = useTranslation();
  const { stores, getRegion } = useStores();

  return {
    t,
    stores,
    initialRegion: getRegion(),
  };
};
