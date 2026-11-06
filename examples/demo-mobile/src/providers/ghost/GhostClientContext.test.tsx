import React from 'react';
import { renderHook } from '@testing-library/react-native';
import {
  GhostClientContext,
  useGhostClient,
  useGhostDPoPKey,
} from './GhostClientContext';
import type { GhostClientCore } from '@vesper-core/ghost-ledger';

describe('GhostClientContext', () => {
  // Suppress expected console.errors from React when an error is thrown in renderHook
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('useGhostClient', () => {
    it('throws an error if used outside of GhostClientContext.Provider', () => {
      expect(() => {
        renderHook(() => useGhostClient());
      }).toThrow(
        '[GhostClientContext] useGhostClient must be used within a GhostClientContext.Provider.',
      );
    });

    it('returns the client when used inside GhostClientContext.Provider', () => {
      const mockClient = { name: 'MockClient' } as unknown as GhostClientCore;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <GhostClientContext.Provider value={{ client: mockClient, dpopPublicKey: null }}>
          {children}
        </GhostClientContext.Provider>
      );

      const { result } = renderHook(() => useGhostClient(), { wrapper });

      expect(result.current).toBe(mockClient);
    });
  });

  describe('useGhostDPoPKey', () => {
    it('throws an error if used outside of GhostClientContext.Provider', () => {
      expect(() => {
        renderHook(() => useGhostDPoPKey());
      }).toThrow(
        '[GhostClientContext] useGhostDPoPKey must be used within a GhostClientContext.Provider.',
      );
    });

    it('returns the dpopPublicKey when used inside GhostClientContext.Provider', () => {
      const mockKey = { kty: 'RSA', e: 'AQAB', n: 'mock-n' } as JsonWebKey;
      const mockClient = {} as unknown as GhostClientCore;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <GhostClientContext.Provider value={{ client: mockClient, dpopPublicKey: mockKey }}>
          {children}
        </GhostClientContext.Provider>
      );

      const { result } = renderHook(() => useGhostDPoPKey(), { wrapper });

      expect(result.current).toEqual(mockKey);
    });
  });
});
