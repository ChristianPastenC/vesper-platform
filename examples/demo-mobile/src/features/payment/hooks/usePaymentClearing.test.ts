import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePaymentClearing } from './usePaymentClearing';
import { getNativeClient } from '../../../../../../packages/ghost-ledger/src/ledger/queue';
import { simulateNetworkRestore, simulateNetworkDrop } from '../__mocks__/network';
import { useAuthenticatedRequest } from '../../../core/auth/useAuthenticatedRequest';

jest.mock('../../../../../../packages/ghost-ledger/src/ledger/queue', () => ({
  getNativeClient: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => {
  const { mockNetInfo } = jest.requireActual('../__mocks__/network');
  return mockNetInfo;
});

jest.mock('../../../core/auth/useAuthenticatedRequest', () => ({
  useAuthenticatedRequest: jest.fn(),
}));

describe('usePaymentClearing', () => {
  let mockClient: {
    getQueueIds: jest.Mock;
    getTransactionPayload: jest.Mock;
    base64UrlEncode: jest.Mock;
    dequeueTransaction: jest.Mock;
  };

  const mockExecute = jest.fn();

  beforeEach(() => {
    mockClient = {
      getQueueIds: jest.fn().mockReturnValue([]),
      getTransactionPayload: jest.fn(),
      base64UrlEncode: jest.fn(),
      dequeueTransaction: jest.fn(),
    };
    (getNativeClient as jest.Mock).mockReturnValue(mockClient);
    (useAuthenticatedRequest as jest.Mock).mockReturnValue({
      execute: mockExecute,
    });
    mockExecute.mockClear();

    simulateNetworkRestore();
  });

  it('does nothing if the queue is empty on network restore', async () => {
    renderHook(() => usePaymentClearing());
    simulateNetworkDrop();

    await act(async () => {
      simulateNetworkRestore();
    });

    expect(mockClient.getQueueIds).toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('processes the queue and dequeues on successful fetch when network is restored', async () => {
    mockClient.getQueueIds.mockReturnValue(['txn-1', 'txn-2']);
    mockClient.getTransactionPayload.mockReturnValue(new ArrayBuffer(8));
    mockClient.base64UrlEncode.mockReturnValue('base64payload');

    mockExecute.mockResolvedValueOnce({ syncedIds: ['txn-1', 'txn-2'] });

    renderHook(() => usePaymentClearing());
    simulateNetworkDrop();

    await act(async () => {
      simulateNetworkRestore();
    });

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    expect(mockExecute).toHaveBeenCalledWith('sync-offline-payments', {
      method: 'POST',
      path: '/api/v1/checkout/sync',
      body: {
        transactions: [
          { transactionId: 'txn-1', payload: 'base64payload' },
          { transactionId: 'txn-2', payload: 'base64payload' },
        ],
      },
    });

    expect(mockClient.dequeueTransaction).toHaveBeenCalledTimes(2);
    expect(mockClient.dequeueTransaction).toHaveBeenCalledWith('txn-1');
    expect(mockClient.dequeueTransaction).toHaveBeenCalledWith('txn-2');
  });

  it('stops processing the queue if a fetch fails', async () => {
    mockClient.getQueueIds.mockReturnValue(['txn-1', 'txn-2']);
    mockClient.getTransactionPayload.mockReturnValue(new ArrayBuffer(8));
    mockClient.base64UrlEncode.mockReturnValue('base64payload');

    mockExecute.mockRejectedValueOnce(new Error('Network Error'));

    renderHook(() => usePaymentClearing());
    simulateNetworkDrop();

    await act(async () => {
      simulateNetworkRestore();
    });

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    expect(mockClient.dequeueTransaction).not.toHaveBeenCalled();
  });

  it('handles missing payload gracefully and continues with valid ones', async () => {
    mockClient.getQueueIds.mockReturnValue(['txn-missing', 'txn-valid']);
    mockClient.getTransactionPayload
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(new ArrayBuffer(8));
    mockClient.base64UrlEncode.mockReturnValue('base64payload');

    mockExecute.mockResolvedValueOnce({ syncedIds: ['txn-valid'] });

    renderHook(() => usePaymentClearing());
    simulateNetworkDrop();

    await act(async () => {
      simulateNetworkRestore();
    });

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    expect(mockExecute).toHaveBeenCalledWith(
      'sync-offline-payments',
      expect.objectContaining({
        body: { transactions: [{ transactionId: 'txn-valid', payload: 'base64payload' }] },
      }),
    );

    expect(mockClient.dequeueTransaction).toHaveBeenCalledTimes(1);
    expect(mockClient.dequeueTransaction).toHaveBeenCalledWith('txn-valid');
  });
});
