import { useTranslation } from 'react-i18next';
import { useStores } from '../hooks/useStores';

export const useStoresScreen = () => {
  const { t } = useTranslation();
  const { stores } = useStores();

  const handleRoutePress = (id: string) => {
    // Navigate to route or open maps
    console.log('Route to store', id);
  };

  return {
    t,
    stores,
    handleRoutePress,
  };
};
