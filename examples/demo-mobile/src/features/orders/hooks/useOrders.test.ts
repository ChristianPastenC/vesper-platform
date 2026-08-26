import { renderHook, waitFor } from '@testing-library/react-native';
import { useOrders, Order } from './useOrders';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { useAppStore } from '../../../store/useAppStore';

jest.mock('../../../core/auth/useAuthenticatedRequest', () => ({
  useAuthenticatedRequest: jest.fn(),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

const mockOrders: Order[] = [
  {
    id: 'ORD-1',
    status: 'processing',
    createdAt: 1700469900,
    total: 100,
    items: [],
    timeline: [],
  },
  {
    id: 'ORD-2',
    status: 'delivered',
    createdAt: 1697380200,
    total: 200,
    items: [],
    timeline: [],
  },
];

describe('useOrders', () => {
  const mockExecute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthenticatedRequest as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { isAuthenticated: true };
      return selector(state);
    });
  });

  it('fetches orders when authenticated', async () => {
    mockExecute.mockResolvedValueOnce(mockOrders);

    const { result } = renderHook(() => useOrders());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orders).toEqual(mockOrders);
    expect(mockExecute).toHaveBeenCalledWith('fetch-orders', {
      method: 'GET',
      path: '/api/v1/orders',
    });
  });

  it('filters active and past orders correctly', async () => {
    mockExecute.mockResolvedValueOnce(mockOrders);

    const { result } = renderHook(() => useOrders());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeOrders).toHaveLength(1);
    expect(result.current.activeOrders[0].id).toBe('ORD-1');

    expect(result.current.pastOrders).toHaveLength(1);
    expect(result.current.pastOrders[0].id).toBe('ORD-2');
  });

  it('finds an order by id', async () => {
    mockExecute.mockResolvedValueOnce(mockOrders);

    const { result } = renderHook(() => useOrders());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const foundOrder = result.current.getOrderById('ORD-1');
    expect(foundOrder).toEqual(mockOrders[0]);
  });

  it('returns undefined for non-existent order', async () => {
    mockExecute.mockResolvedValueOnce(mockOrders);

    const { result } = renderHook(() => useOrders());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const foundOrder = result.current.getOrderById('non-existent');
    expect(foundOrder).toBeUndefined();
  });

  it('handles fetch error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Fetch failed'));

    const { result } = renderHook(() => useOrders());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Fetch failed');
    expect(result.current.orders).toEqual([]);
  });
});
