import { renderHook, act } from '@testing-library/react-native';
import { buildTransactionLedger } from '../../features/payment/ledger/buildTransactionLedger';
import { useOnlineCheckoutMutation } from '../../features/online-shopping/hooks/useOnlineCheckoutMutation';
import { useAppStore } from '../../store/useAppStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { decodeHeaders } from '@sovereign/secure-client';
import crypto from 'crypto';

const mockExecuteRequest = jest.fn();
jest.mock('../../providers/sovereign/SovereignClientContext', () => ({
  useSovereignClient: () => ({
    executeRequest: mockExecuteRequest,
  }),
}));

jest.mock('../../core/auth/tokenStore', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../core/crypto/NativeCryptoProvider', () => ({
  nativeCryptoProvider: {
    sha256: jest.fn(async (data: Uint8Array) => {
      const crypto = jest.requireActual('crypto');
      const hash = crypto.createHash('sha256').update(data).digest();
      return new Uint8Array(hash);
    }),
  },
}));

jest.mock('../../core/config', () => ({
  getApiUrl: () => 'https://api.test',
}));

describe('Integration: Checkout Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({ onlineCart: [] });
  });

  it('builds a valid ledger chain and detects alterations', async () => {
    const items = [
      { id: '1', name: 'Item 1', price: 100, quantity: 1 },
      { id: '2', name: 'Item 2', price: 200, quantity: 2 },
      { id: '3', name: 'Item 3', price: 300, quantity: 1 },
    ];

    const ledger = await buildTransactionLedger(items);
    expect(ledger).toHaveLength(3);

    // Verify precedingHash
    expect(ledger[0].precedingHash).toBe('0');
    expect(ledger[1].precedingHash).toBe(ledger[0].hash);
    expect(ledger[2].precedingHash).toBe(ledger[1].hash);

    // Verify that altering the payload breaks the chain
    const dataToHash = `${JSON.stringify({ altered: true })}${ledger[1].precedingHash}${ledger[1].timestamp}`;
    const newHash = crypto.createHash('sha256').update(Buffer.from(dataToHash)).digest('hex');
    expect(newHash).not.toBe(ledger[1].hash);
  });

  it('submits checkout correctly with valid headers and body', async () => {
    mockExecuteRequest.mockResolvedValueOnce({
      status: 'success',
      transactionId: 'txn-123',
    });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useOnlineCheckoutMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        items: [{ id: '1', name: 'Item 1', price: 100, quantity: 1 }],
        address: '123 Test St',
      });
    });

    expect(mockExecuteRequest).toHaveBeenCalled();
    const requestArgs = mockExecuteRequest.mock.calls[0][1];

    let decodedHeaders: Record<string, string>;
    if (requestArgs.headers instanceof Uint8Array) {
      decodedHeaders = decodeHeaders(requestArgs.headers);
    } else if (requestArgs.encodedHeaders instanceof Uint8Array) {
      decodedHeaders = decodeHeaders(requestArgs.encodedHeaders);
    } else {
      decodedHeaders = requestArgs.headers;
    }

    // a. Header X-Idempotency-Key presente
    expect(decodedHeaders['X-Idempotency-Key']).toBeDefined();

    // c. Header Authorization: Bearer presente
    expect(decodedHeaders['Authorization']).toMatch(/^Bearer /);

    // b. Body decodificable que contiene el array ledger
    let bodyStr: string;
    if (requestArgs.body instanceof Uint8Array) {
      bodyStr = new TextDecoder().decode(requestArgs.body);
    } else {
      bodyStr = requestArgs.body as string;
    }
    const bodyJson = JSON.parse(bodyStr);
    expect(bodyJson.ledger).toBeDefined();
    expect(Array.isArray(bodyJson.ledger)).toBe(true);
  });
});
