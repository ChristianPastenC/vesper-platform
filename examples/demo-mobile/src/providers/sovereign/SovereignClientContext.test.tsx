import React from 'react';
import { renderHook } from '@testing-library/react-native';
import {
  SovereignClientContext,
  useSovereignClient,
  useSovereignDPoPKey,
} from './SovereignClientContext';
import type { SovereignClientCore } from '@vesper/ghost-ledger';

describe('SovereignClientContext', () => {
  // Suppress expected console.errors from React when an error is thrown in renderHook
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('useSovereignClient', () => {
    it('throws an error if used outside of SovereignClientContext.Provider', () => {
      expect(() => {
        renderHook(() => useSovereignClient());
      }).toThrow(
        '[SovereignClientContext] useSovereignClient must be used within a SovereignClientContext.Provider.',
      );
    });

    it('returns the client when used inside SovereignClientContext.Provider', () => {
      const mockClient = { name: 'MockClient' } as unknown as SovereignClientCore;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SovereignClientContext.Provider value={{ client: mockClient, dpopPublicKey: null }}>
          {children}
        </SovereignClientContext.Provider>
      );

      const { result } = renderHook(() => useSovereignClient(), { wrapper });

      expect(result.current).toBe(mockClient);
    });
  });

  describe('useSovereignDPoPKey', () => {
    it('throws an error if used outside of SovereignClientContext.Provider', () => {
      expect(() => {
        renderHook(() => useSovereignDPoPKey());
      }).toThrow(
        '[SovereignClientContext] useSovereignDPoPKey must be used within a SovereignClientContext.Provider.',
      );
    });

    it('returns the dpopPublicKey when used inside SovereignClientContext.Provider', () => {
      const mockKey = { kty: 'RSA', e: 'AQAB', n: 'mock-n' } as JsonWebKey;
      const mockClient = {} as unknown as SovereignClientCore;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SovereignClientContext.Provider value={{ client: mockClient, dpopPublicKey: mockKey }}>
          {children}
        </SovereignClientContext.Provider>
      );

      const { result } = renderHook(() => useSovereignDPoPKey(), { wrapper });

      expect(result.current).toEqual(mockKey);
    });
  });
});
