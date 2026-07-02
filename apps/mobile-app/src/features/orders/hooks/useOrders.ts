import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { useAppStore } from '../../../store/useAppStore';

export interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface OrderTimelineEvent {
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'succeeded' | 'failed' | 'synced';
  timestamp: string;
  description: string;
}

export interface Order {
  id: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'succeeded' | 'failed' | 'synced';
  createdAt: number;
  total: number;
  items: OrderItem[];
  timeline: OrderTimelineEvent[];
  type?: string;
}

export const formatOrderDate = (createdAt: number) =>
  new Date(createdAt * 1000).toLocaleDateString();

export const useOrders = () => {
  const { execute } = useAuthenticatedRequest();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await execute<Order[]>('fetch-orders', {
        method: 'GET',
        path: '/api/v1/orders',
      });
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [execute, isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'processing' || o.status === 'shipped');
  }, [orders]);

  const pastOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');
  }, [orders]);

  const getOrderById = useCallback(
    (id: string): Order | undefined => {
      return orders.find((o) => o.id === id);
    },
    [orders],
  );

  return {
    orders,
    activeOrders,
    pastOrders,
    getOrderById,
    isLoading,
    error,
    refetch: fetchOrders,
  };
};
