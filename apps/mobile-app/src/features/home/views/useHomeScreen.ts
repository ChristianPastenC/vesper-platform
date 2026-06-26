import { useHome } from '../hooks/useHome';
import { useAppStore } from '../../../store/useAppStore';

export const useHomeScreen = () => {
  const {
    t,
    userName,
    isAuthenticated,
    isOnline,
    toggleNetwork,
    navigateToCatalog,
    navigateToScanner,
    navigateToAccount,
  } = useHome();

  const isFrozen = !isOnline;

  const onlineCart = useAppStore((state) => state.onlineCart);
  const cartItemsCount = onlineCart.reduce((acc, item) => acc + item.quantity, 0);

  const TRENDING_PRODUCTS = [
    { id: '1', name: 'Silk Blend Shirt', price: '$120.00' },
    { id: '2', name: 'Leather Weekender', price: '$350.00' },
    { id: '3', name: 'Cashmere Beanie', price: '$85.00' },
  ];

  return {
    t,
    userName,
    isAuthenticated,
    isFrozen,
    cartItemsCount,
    toggleNetwork,
    navigateToCatalog,
    navigateToScanner,
    navigateToAccount,
    TRENDING_PRODUCTS,
  };
};
