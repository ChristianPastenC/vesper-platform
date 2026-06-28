import { renderHook, waitFor } from '@testing-library/react-native';
import { useStores } from './useStores';

const mockStoresResponse = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.4324, 37.78825] },
      properties: {
        id: '1',
        name: 'Sovereign Downtown',
        distance: '1.2 km',
        hours: '09:00 - 21:00',
        address: '123 Main St, Downtown',
      },
    },
  ],
};

describe('useStores', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as jest.Mock;
    jest.clearAllMocks();
  });

  it('fetches stores correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStoresResponse,
    });

    const { result } = renderHook(() => useStores());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stores).toHaveLength(1);
    expect(result.current.stores[0].name).toBe('Sovereign Downtown');
    expect(result.current.stores[0].coordinate.latitude).toBe(37.78825);
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to fetch stores');
    expect(result.current.stores).toEqual([]);
  });

  it('handles fetch error that is not an Error instance', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce('string error');

    const { result } = renderHook(() => useStores());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Unknown error');
    expect(result.current.stores).toEqual([]);
  });

  it('provides correct default region', () => {
    const { result } = renderHook(() => useStores());
    const region = result.current.getRegion();
    expect(region).toMatchObject({
      latitude: 37.78825,
      longitude: -122.4324,
    });
  });
});
