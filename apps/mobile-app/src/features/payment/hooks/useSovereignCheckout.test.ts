import { renderHook, act } from '@testing-library/react-native';
import { useSovereignCheckout } from './useSovereignCheckout';
import { useSovereignClient } from '../../../providers/sovereign/SovereignClientContext';
import { buildTransactionLedger } from '../ledger/buildTransactionLedger';
import { getAccessToken } from '../../../core/auth/tokenStore';
import * as Crypto from 'expo-crypto';

jest.mock('../../../providers/sovereign/SovereignClientContext', () => ({
  useSovereignClient: jest.fn(),
}));

jest.mock('../ledger/buildTransactionLedger', () => ({
  buildTransactionLedger: jest.fn(),
}));

jest.mock('../../../core/auth/tokenStore', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

jest.mock('@sovereign/secure-client', () => ({
  encodeJsonBody: jest.fn((body) => JSON.stringify(body)),
}));

describe('useSovereignCheckout', () => {
  const mockExecuteRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSovereignClient as jest.Mock).mockReturnValue({ executeRequest: mockExecuteRequest });
    (getAccessToken as jest.Mock).mockResolvedValue('mock-token');
    (Crypto.randomUUID as jest.Mock).mockReturnValue('mock-uuid');
    (buildTransactionLedger as jest.Mock).mockResolvedValue([{ index: 0, payload: 'mock' }]);
  });

  it('executes checkout successfully', async () => {
    mockExecuteRequest.mockResolvedValue({
      success: true,
      transactionId: 'txn-123',
      timestamp: 12345,
    });

    const { result } = renderHook(() => useSovereignCheckout());

    let res;
    await act(async () => {
      res = await result.current.executeCheckout([{ id: '1' }]);
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(res).toEqual({ success: true, transactionId: 'txn-123', timestamp: 12345 });
    expect(mockExecuteRequest).toHaveBeenCalledWith(
      'checkout-mock-uuid',
      expect.objectContaining({
        method: 'POST',
        url: '/api/v1/checkout/pay',
        headers: expect.objectContaining({
          Authorization: 'DPoP mock-token',
        }),
      }),
    );
  });

  it('handles checkout error', async () => {
    mockExecuteRequest.mockRejectedValue(new Error('Checkout failed error'));

    const { result } = renderHook(() => useSovereignCheckout());

    await expect(result.current.executeCheckout([{ id: '1' }])).rejects.toThrow(
      'Checkout failed error',
    );
  });
});
