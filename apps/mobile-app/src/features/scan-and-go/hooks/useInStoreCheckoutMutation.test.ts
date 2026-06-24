import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useInStoreCheckoutMutation } from './useInStoreCheckoutMutation';
import { useAppStore } from '../../../store/useAppStore';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { buildTransactionLedger } from '../../payment/ledger/buildTransactionLedger';
import { encodeJsonBody, encodeHeaders } from '@sovereign/secure-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../../../core/auth/useAuthenticatedRequest', () => ({
  useAuthenticatedRequest: jest.fn(),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('../../payment/ledger/buildTransactionLedger', () => ({
  buildTransactionLedger: jest.fn(),
}));

jest.mock('@sovereign/secure-client', () => ({
  encodeJsonBody: jest.fn((body) => new Uint8Array(Buffer.from(JSON.stringify(body)))),
  encodeHeaders: jest.fn((headers) => headers),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useInStoreCheckoutMutation', () => {
  const mockClearCart = jest.fn();
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ clearInStoreCart: mockClearCart });
    });
    (useAuthenticatedRequest as jest.Mock).mockReturnValue({ execute: mockExecuteRequest });
    (getAccessToken as jest.Mock).mockResolvedValue('mock-token');
    (buildTransactionLedger as jest.Mock).mockResolvedValue([{ hash: 'mock-ledger-hash' }]);
  });

  it('mutates successfully when online and clears cart', async () => {
    mockExecuteRequest.mockResolvedValue({
      transactionId: 'TXN-STORE-123',
      status: 'success',
      receiptHash: 'abc',
      isFrozen: false,
    });

    const { result } = renderHook(() => useInStoreCheckoutMutation(), { wrapper });

    act(() => {
      result.current.mutate({ items: [{ id: '1', name: 'Shoes', price: 50, quantity: 1 }] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.orderId).toBe('TXN-STORE-123');
    expect(result.current.data?.isQueued).toBe(false);
    expect(mockClearCart).toHaveBeenCalled();
  });

  it('resolves and queues the request when offline, without clearing cart', async () => {
    mockExecuteRequest.mockResolvedValue({
      transactionId: 'TXN-STORE-QUEUED',
      status: 'pending',
      receiptHash: 'none',
      isFrozen: true,
    });

    const { result } = renderHook(() => useInStoreCheckoutMutation(), { wrapper });

    act(() => {
      result.current.mutate({ items: [{ id: '1', name: 'Shoes', price: 50, quantity: 1 }] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.orderId).toBe('TXN-STORE-QUEUED');
    expect(result.current.data?.isQueued).toBe(true);
    // Does NOT clear cart on enqueue
    expect(mockClearCart).not.toHaveBeenCalled();
  });
});
