import { renderHook } from '@testing-library/react-native';
import { useOrders } from './useOrders';
import { MOCK_ORDERS } from './orders.mock';

describe('useOrders', () => {
  it('should return all orders', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.orders).toEqual(MOCK_ORDERS);
  });

  it('should return active orders (processing or shipped)', () => {
    const { result } = renderHook(() => useOrders());
    const activeOrders = result.current.activeOrders;

    expect(activeOrders.length).toBeGreaterThan(0);
    activeOrders.forEach((order) => {
      expect(['processing', 'shipped']).toContain(order.status);
    });
  });

  it('should return past orders (delivered or cancelled)', () => {
    const { result } = renderHook(() => useOrders());
    const pastOrders = result.current.pastOrders;

    expect(pastOrders.length).toBeGreaterThan(0);
    pastOrders.forEach((order) => {
      expect(['delivered', 'cancelled']).toContain(order.status);
    });
  });

  it('should get an order by id', () => {
    const { result } = renderHook(() => useOrders());
    const orderToFind = MOCK_ORDERS[0];

    const foundOrder = result.current.getOrderById(orderToFind.id);
    expect(foundOrder).toEqual(orderToFind);
  });

  it('should return undefined for non-existent order id', () => {
    const { result } = renderHook(() => useOrders());

    const foundOrder = result.current.getOrderById('non-existent-id');
    expect(foundOrder).toBeUndefined();
  });
});
