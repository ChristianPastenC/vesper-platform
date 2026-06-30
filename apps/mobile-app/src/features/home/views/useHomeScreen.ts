import { useHome } from '../hooks/useHome';
import { useAppStore } from '../../../store/useAppStore';
import { useSovereignCatalog } from '../../catalog/hooks/useSovereignCatalog';

import { Product } from '../../catalog/domain/product.entity';

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
    navigateToStores,
    navigateToOrders,
  } = useHome();

  const isFrozen = !isOnline;

  const onlineCart = useAppStore((state) => state.onlineCart);
  const addToOnlineCart = useAppStore((state) => state.addToOnlineCart);
  const cartItemsCount = onlineCart.reduce((acc, item) => acc + item.quantity, 0);

  // Fetch real catalog data with a limit of 5 for trending
  const { products: TRENDING_PRODUCTS } = useSovereignCatalog(undefined, 5);

  const handleAddToOnline = (product: Product) => {
    addToOnlineCart({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  };

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
    navigateToStores,
    navigateToOrders,
    TRENDING_PRODUCTS,
    handleAddToOnline,
  };
};
