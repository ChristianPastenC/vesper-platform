import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSovereignCatalog } from './useSovereignCatalog';

jest.mock('../../../core/config', () => ({
  getApiUrl: jest.fn(() => 'http://localhost:8080'),
}));

describe('useSovereignCatalog', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  it('fetches and returns products', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          title: 'Product 1',
          price: 10,
          barcode: '111',
          description: 'desc',
          category: 'cat',
          image: 'url',
        },
      ],
    });

    const { result } = renderHook(() => useSovereignCatalog());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('Product 1');
    expect(result.current.error).toBeNull();
  });

  it('handles error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));

    const { result } = renderHook(() => useSovereignCatalog('cat-error'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.products).toHaveLength(0);
  });

  it('handles abort gracefully without setting state', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => [] }), 100)));

    const { result, unmount } = renderHook(() => useSovereignCatalog());

    expect(result.current.loading).toBe(true);
    unmount(); // triggers abort
  });

  it('handles AbortError in catch block', async () => {
    const abortError = new Error('Canceled');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    renderHook(() => useSovereignCatalog());

    await waitFor(() => {
      // Just wait a tick
    });
  });

  it('handles non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useSovereignCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(0);
    expect(result.current.error).toBeTruthy();
  });

  it('handles refetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    const { result } = renderHook(() => useSovereignCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
