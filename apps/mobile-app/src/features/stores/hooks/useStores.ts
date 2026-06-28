import { useState, useEffect } from 'react';

// GeoJSON format for the stores mock data
const storesGeoJSON = {
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
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.4224, 37.79825] },
      properties: {
        id: '2',
        name: 'Sovereign Uptown',
        distance: '3.4 km',
        hours: '10:00 - 20:00',
        address: '456 High St, Uptown',
      },
    },
  ],
};

export interface StoreFeature {
  id: string;
  name: string;
  distance: string;
  hours: string;
  address: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

export const useStores = () => {
  const [stores, setStores] = useState<StoreFeature[]>([]);

  useEffect(() => {
    // Parse GeoJSON into friendly format for map and list
    const parsedStores = storesGeoJSON.features.map((feature) => ({
      id: feature.properties.id,
      name: feature.properties.name,
      distance: feature.properties.distance,
      hours: feature.properties.hours,
      address: feature.properties.address,
      coordinate: {
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
      },
    }));
    setStores(parsedStores);
  }, []);

  const getRegion = () => ({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  return {
    stores,
    getRegion,
  };
};
