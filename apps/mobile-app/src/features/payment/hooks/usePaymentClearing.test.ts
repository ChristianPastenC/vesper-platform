import { renderHook, act } from '@testing-library/react-native';
import { usePaymentClearing } from './usePaymentClearing';
import { getNativeClient } from '../../../../../../packages/secure-client/src/ledger/queue';
import { simulateNetworkRestore, simulateNetworkDrop } from '../__mocks__/network';

// Mock getNativeClient
jest.mock('../../../../../../packages/secure-client/src/ledger/queue', () => ({
  getNativeClient: jest.fn(),
}));

// Mock NetInfo using our mock
jest.mock('@react-native-community/netinfo', () => {
  const { mockNetInfo } = require('../__mocks__/network');
  return mockNetInfo;
});

// Mock global fetch
global.fetch = jest.fn();

describe('usePaymentClearing', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      getQueueIds: jest.fn().mockReturnValue([]),
      getTransactionPayload: jest.fn(),
      base64UrlEncode: jest.fn(),
      dequeueTransaction: jest.fn(),
    };
    (getNativeClient as jest.Mock).mockReturnValue(mockClient);
    (global.fetch as jest.Mock).mockClear();
    
    // Reset network state to online
    simulateNetworkRestore();
  });

  it('does nothing if the queue is empty on network restore', async () => {
    renderHook(() => usePaymentClearing());
    
    simulateNetworkDrop();
    
    await act(async () => {
      simulateNetworkRestore();
    });

    expect(mockClient.getQueueIds).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('processes the queue and dequeues on successful fetch when network is restored', async () => {
    mockClient.getQueueIds.mockReturnValue(['txn-1', 'txn-2']);
    mockClient.getTransactionPayload.mockReturnValue(new ArrayBuffer(8));
    mockClient.base64UrlEncode.mockReturnValue('base64payload');
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    });

    renderHook(() => usePaymentClearing());
    
    simulateNetworkDrop();
    
    await act(async () => {
      simulateNetworkRestore();
    });

    // Wait for the async processQueue loop to clear
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockClient.getQueueIds).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(mockClient.dequeueTransaction).toHaveBeenCalledTimes(2);
    expect(mockClient.dequeueTransaction).toHaveBeenCalledWith('txn-1');
    expect(mockClient.dequeueTransaction).toHaveBeenCalledWith('txn-2');
  });

  it('stops processing the queue if a fetch fails to preserve FIFO', async () => {
    mockClient.getQueueIds.mockReturnValue(['txn-1', 'txn-2']);
    mockClient.getTransactionPayload.mockReturnValue(new ArrayBuffer(8));
    mockClient.base64UrlEncode.mockReturnValue('base64payload');
    
    // First fetch fails, second should not be called
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderHook(() => usePaymentClearing());
    
    simulateNetworkDrop();
    
    await act(async () => {
      simulateNetworkRestore();
    });

    // Wait for async execution
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockClient.dequeueTransaction).not.toHaveBeenCalled(); // Dequeue is skipped for failures
  });

  it('handles missing payload gracefully and continues', async () => {
    mockClient.getQueueIds.mockReturnValue(['txn-missing', 'txn-valid']);
    // Return null for first, ArrayBuffer for second
    mockClient.getTransactionPayload.mockReturnValueOnce(null).mockReturnValueOnce(new ArrayBuffer(8));
    mockClient.base64UrlEncode.mockReturnValue('base64payload');
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    });

    renderHook(() => usePaymentClearing());
    
    simulateNetworkDrop();
    
    await act(async () => {
      simulateNetworkRestore();
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1); // Only called for the valid one
    expect(mockClient.dequeueTransaction).toHaveBeenCalledTimes(1);
    expect(mockClient.dequeueTransaction).toHaveBeenCalledWith('txn-valid');
  });
});
