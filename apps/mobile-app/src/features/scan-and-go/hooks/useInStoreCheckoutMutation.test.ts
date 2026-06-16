import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useInStoreCheckoutMutation } from './useInStoreCheckoutMutation';
import { useAppStore } from '../../../store/useAppStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useInStoreCheckoutMutation', () => {
  const mockClearCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mutates successfully when online and clears cart', async () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ clearInStoreCart: mockClearCart, isOnline: true });
    });

    const { result } = renderHook(() => useInStoreCheckoutMutation(), { wrapper });

    act(() => {
      result.current.mutate({ items: [] });
    });



    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.data?.orderId).toBeDefined();
    expect(mockClearCart).toHaveBeenCalled();
  });

  it('rejects when offline', async () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ clearInStoreCart: mockClearCart, isOnline: false });
    });

    const { result } = renderHook(() => useInStoreCheckoutMutation(), { wrapper });

    act(() => {
      result.current.mutate({ items: [] });
    });



    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.error?.message).toMatch(/No network signal/);
    expect(mockClearCart).not.toHaveBeenCalled();
  });
});
