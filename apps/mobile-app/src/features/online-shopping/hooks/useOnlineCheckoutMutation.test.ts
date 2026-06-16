import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOnlineCheckoutMutation } from './useOnlineCheckoutMutation';
import { useAppStore } from '../../../store/useAppStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useOnlineCheckoutMutation', () => {
  const mockClearCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ clearOnlineCart: mockClearCart });
    });
  });

  it('mutates successfully and clears cart', async () => {
    const { result } = renderHook(() => useOnlineCheckoutMutation(), { wrapper });

    act(() => {
      result.current.mutate({ items: [], address: 'Test Address' });
    });



    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 3000 });

    expect(result.current.data?.orderId).toBeDefined();
    expect(mockClearCart).toHaveBeenCalled();
  });
});
