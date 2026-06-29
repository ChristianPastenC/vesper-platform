import { useState, useEffect, useCallback } from 'react';
import { Product } from '../components/ProductCard';
import { getApiUrl } from '../../../core/config';

export interface BackendProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  barcode: string;
}

export const useSovereignCatalog = (category?: string, limit: number = 20) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCatalog = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const API_URL = getApiUrl();
        setLoading(true);
        setError(null);

        let url = `${API_URL}/api/v1/catalog?limit=${limit}`;
        if (category) {
          url += `&category=${encodeURIComponent(category)}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch catalog');
        }

        const data: BackendProduct[] = await response.json();

        const mappedProducts: Product[] = data.map((p) => ({
          id: String(p.id),
          name: p.title,
          price: p.price,
          barcode: p.barcode,
          image: p.image,
        }));

        if (signal?.aborted) return;

        setProducts(mappedProducts);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name === 'AbortError' || err.message === 'Canceled' || signal?.aborted) {
            return;
          }
        }
        setError(err instanceof Error ? err : new Error('Failed to fetch catalog'));
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [category, limit],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchCatalog]);

  const refetch = useCallback(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    products,
    loading,
    error,
    isEmpty: !loading && products.length === 0,
    refetch,
  };
};
