import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../../core/config';

export interface StoreFeature {
  id: string;
  name: string;
  distance: string;
  hours: string;
  address: string;
  image?: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export const useStores = () => {
  const [stores, setStores] = useState<StoreFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/v1/stores`);
      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }
      const data = await response.json();

      interface RawStoreFeature {
        geometry: { coordinates: number[] };
        properties: {
          id: string;
          name: string;
          distance: string;
          hours: string;
          address: string;
          image?: string;
        };
      }

      const parsedStores = data.features.map((feature: RawStoreFeature) => ({
        id: feature.properties.id,
        name: feature.properties.name,
        distance: feature.properties.distance,
        hours: feature.properties.hours,
        address: feature.properties.address,
        image: feature.properties.image,
        coordinate: {
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
        },
      }));
      setStores(parsedStores);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const getRegion = () => ({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  return {
    stores,
    getRegion,
    isLoading,
    error,
    refetch: fetchStores,
  };
};
