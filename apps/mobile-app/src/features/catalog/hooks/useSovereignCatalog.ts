import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { Product } from '../components/ProductCard';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { SovereignAdapterRequest } from '@sovereign/secure-client';
import { randomUUID } from 'react-native-quick-crypto';
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

  const { execute } = useAuthenticatedRequest();

  const fetchCatalog = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const API_URL = getApiUrl();
        setLoading(true);
        setError(null);

        const token = await getAccessToken();
        const headers: Record<string, string> = {
          Accept: 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        let url = `${API_URL}/api/v1/catalog?limit=${limit}`;
        if (category) {
          url += `&category=${encodeURIComponent(category)}`;
        }

        const request: SovereignAdapterRequest = {
          method: 'GET',
          url,
          headers,
          signal,
        };

        const requestId = randomUUID();
        const response = await execute<BackendProduct[]>(requestId, request);

        const mappedProducts: Product[] = response.map((p) => ({
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
    [execute, category, limit],
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
