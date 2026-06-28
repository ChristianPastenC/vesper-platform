import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '../../../store/useAppStore';
import { TabParamList, RootStackParamList } from '../../../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList & TabParamList>;

export const useHome = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const userName = useAppStore((state) => state.userName);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isOnline = useAppStore((state) => state.isOnline);
  const toggleNetwork = useAppStore((state) => state.toggleNetwork);

  const navigateToCatalog = () => {
    navigation.navigate('CatalogTab');
  };

  const navigateToOnlineCart = () => {
    navigation.navigate('OnlineCart');
  };

  const navigateToScanner = () => {
    navigation.navigate('ScanAndGoTab');
  };

  const navigateToAccount = () => {
    navigation.navigate('ProfileTab');
  };

  const navigateToStores = () => {
    navigation.navigate('Stores');
  };

  const navigateToOrders = () => {
    navigation.navigate('Orders');
  };

  return {
    t,
    userName,
    isAuthenticated,
    isOnline,
    toggleNetwork,
    navigateToCatalog,
    navigateToOnlineCart,
    navigateToScanner,
    navigateToAccount,
    navigateToStores,
    navigateToOrders,
  };
};
