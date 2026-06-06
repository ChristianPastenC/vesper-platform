import { useAppStore } from '../../../store/useAppStore';
import { Product } from '../components/ProductCard';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Wireless Headphones',
    price: 99.99,
    barcode: '4006381333931',
  },
  {
    id: '2',
    name: 'Mechanical Keyboard',
    price: 129.99,
    barcode: '4006381333932',
  },
  { id: '3', name: 'Ergonomic Mouse', price: 59.99, barcode: '4006381333933' },
  { id: '4', name: 'USB-C Hub Adapter', price: 39.99, barcode: '4006381333934' },
  {
    id: '5',
    name: 'Smart Fitness Watch',
    price: 199.99,
    barcode: '4006381333935',
  },
];

export const useCatalog = () => {
  const addToOnlineCart = useAppStore((state) => state.addToOnlineCart);
  const addToInStoreCart = useAppStore((state) => state.addToInStoreCart);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const logout = useAppStore((state) => state.logout);

  const handleAddToOnline = (product: Product) => {
    addToOnlineCart({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  };

  const handleAddToInStore = (product: Product) => {
    addToInStoreCart({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
    });
  };

  return {
    products: MOCK_PRODUCTS,
    handleAddToOnline,
    handleAddToInStore,
    isAuthenticated,
    logout,
  };
};
