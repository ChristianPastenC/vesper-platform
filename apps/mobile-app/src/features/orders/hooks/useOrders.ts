import { useState, useMemo, useCallback } from 'react';
import { Order, MOCK_ORDERS } from './orders.mock';

export const useOrders = () => {
  const [orders] = useState<Order[]>(MOCK_ORDERS);

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
  };
};
