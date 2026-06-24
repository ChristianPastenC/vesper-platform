import { useState, useEffect, useCallback } from 'react';
import { useSovereignCatalog } from './useSovereignCatalog';
import { useIsAuthenticated } from '../../../store/useAppStore';
import { Product } from '../components/ProductCard';

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'mock-1',
    name: 'Sovereign Hoodie',
    price: 89.99,
    barcode: '1234567890123',
    image: 'https://via.placeholder.com/300',
  },
  {
    id: 'mock-2',
    name: 'Classic T-Shirt',
    price: 29.99,
    barcode: '1234567890124',
    image: 'https://via.placeholder.com/300',
  },
];

export const useCatalog = (category?: string, limit: number = 20) => {
  const isAuthenticated = useIsAuthenticated();

  // Real catalog fetch
  const sovereignCatalog = useSovereignCatalog(category, limit);

  // Mock catalog fallback state
  const [mockProducts, setMockProducts] = useState<Product[]>([]);
  const [mockLoading, setMockLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setMockLoading(true);
      const timer = setTimeout(() => {
        setMockProducts(MOCK_PRODUCTS);
        setMockLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const mockRefetch = useCallback(() => {
    setMockLoading(true);
    setTimeout(() => {
      setMockProducts(MOCK_PRODUCTS);
      setMockLoading(false);
    }, 500);
  }, []);

  if (isAuthenticated) {
    return sovereignCatalog;
  }

  return {
    products: mockProducts,
    loading: mockLoading,
    error: null,
    isEmpty: !mockLoading && mockProducts.length === 0,
    refetch: mockRefetch,
  };
};
