import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useOnlineCheckoutMutation } from './useOnlineCheckoutMutation';
import { useAppStore } from '../../../store/useAppStore';
import { useSovereignClient } from '../../../providers/SovereignClientContext';
import { getAccessToken } from '../../../core/auth/tokenStore';
import { buildTransactionLedger } from '../../payment/ledger/buildTransactionLedger';
import { encodeJsonBody, encodeHeaders } from '@sovereign/secure-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('../../../providers/SovereignClientContext', () => ({
  useSovereignClient: jest.fn(),
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

describe('useOnlineCheckoutMutation', () => {
  const mockClearCart = jest.fn();
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ clearOnlineCart: mockClearCart });
    });
    (useSovereignClient as jest.Mock).mockReturnValue({ executeRequest: mockExecuteRequest });
    (getAccessToken as jest.Mock).mockResolvedValue('mock-token');
    (buildTransactionLedger as jest.Mock).mockResolvedValue([{ hash: 'mock-ledger-hash' }]);
  });

  it('mutates successfully, submits proper ledger and clears cart', async () => {
    mockExecuteRequest.mockResolvedValue({
      transactionId: 'TXN-12345',
      status: 'success',
      receiptHash: 'abc',
    });

    const { result } = renderHook(() => useOnlineCheckoutMutation(), { wrapper });

    act(() => {
      result.current.mutate({
        items: [{ id: 'item1', name: 'Shoes', price: 100, quantity: 2 }],
        address: 'Test Address',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.orderId).toBe('TXN-12345');
    expect(mockClearCart).toHaveBeenCalled();
    expect(buildTransactionLedger).toHaveBeenCalledWith([
      { id: 'item1', name: 'Shoes', price: 100, quantity: 2 },
    ]);
    expect(encodeHeaders).toHaveBeenCalledWith(expect.objectContaining({
      Authorization: 'Bearer mock-token',
      'X-Idempotency-Key': 'mock-uuid',
    }));
    expect(mockExecuteRequest).toHaveBeenCalledWith('mock-uuid', expect.objectContaining({
      method: 'POST',
      url: expect.stringContaining('/api/v1/checkout/online'),
    }));
  });
});
