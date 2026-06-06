import { useTranslation } from 'react-i18next';
import { useTheme } from '../../core/theme/useTheme';
import { TabParamList } from '../types';

export const useTabNavigator = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getTabBarIconName = (
    routeName: keyof TabParamList
  ):
    | 'home-outline'
    | 'grid-outline'
    | 'cart-outline'
    | 'barcode-outline'
    | 'person-outline' => {
    if (routeName === 'HomeTab') {
      return 'home-outline';
    }
    if (routeName === 'CatalogTab') {
      return 'grid-outline';
    }
    if (routeName === 'OnlineCartTab') {
      return 'cart-outline';
    }
    if (routeName === 'ScanAndGoTab') {
      return 'barcode-outline';
    }
    return 'person-outline';
  };

  return {
    t,
    colors,
    getTabBarIconName,
  };
};
