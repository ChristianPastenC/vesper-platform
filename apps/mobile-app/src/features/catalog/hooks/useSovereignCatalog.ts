import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { Product } from '../components/ProductCard';
import { useSovereignClient } from '../../../providers/SovereignClientContext';
import { SovereignAdapterRequest } from '@sovereign/secure-client';

export const useSovereignCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const client = useSovereignClient();

  const fetchCatalog = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const request: SovereignAdapterRequest = {
        method: 'GET',
        url: '/api/v1/catalog?limit=20',
        headers,
        signal,
      };

      const requestId = `catalog-fetch-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const response = await client.executeRequest<any>(requestId, request);

      // Extract products from common response structures
      let rawProducts: any[] = [];
      if (Array.isArray(response)) {
        rawProducts = response;
      } else if (response?.data && Array.isArray(response.data)) {
        rawProducts = response.data;
      } else if (response?.items && Array.isArray(response.items)) {
        rawProducts = response.items;
      } else if (response?.products && Array.isArray(response.products)) {
        rawProducts = response.products;
      }

      // Map response to local Product type
      const mappedProducts: Product[] = rawProducts.map((p) => ({
        id: String(p.id ?? p._id ?? Math.random().toString()),
        name: String(p.name ?? 'Unknown Product'),
        price: Number(p.price ?? 0),
        barcode: String(p.barcode ?? ''),
      }));

      if (signal?.aborted) return;

      setProducts(mappedProducts);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'Canceled' || signal?.aborted) {
        return;
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch catalog'));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [client]);

  useEffect(() => {
    const controller = new AbortController();
    
    fetchCatalog(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchCatalog]);

  return {
    products,
    loading,
    error,
    isEmpty: !loading && products.length === 0,
    refetch: () => fetchCatalog()
  };
};
