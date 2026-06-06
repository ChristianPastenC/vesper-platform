import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/theme/useTheme';
import { TabParamList } from '../types';

export const useTabNavigator = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getTabBarIconName = (
    routeName: keyof TabParamList
  ): 'grid-outline' | 'cart-outline' | 'barcode-outline' => {
    if (routeName === 'CatalogTab') {
      return 'grid-outline';
    }
    if (routeName === 'OnlineCartTab') {
      return 'cart-outline';
    }
    return 'barcode-outline';
  };

  return {
    t,
    colors,
    getTabBarIconName,
  };
};
