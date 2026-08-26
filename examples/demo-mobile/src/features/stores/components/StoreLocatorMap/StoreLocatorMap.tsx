import React, { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../../../core/theme/useTheme';
import { useStoreLocatorMap } from './useStoreLocatorMap';
import { stylesFactory } from './StoreLocatorMap.styles';

export const StoreLocatorMap: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { stores, initialRegion } = useStoreLocatorMap();

  const htmlContent = useMemo(() => {
    const markersHtml = stores
      .map(
        (store) =>
          `L.marker([${store.coordinate.latitude}, ${store.coordinate.longitude}]).addTo(map)
           .bindPopup("<b>${store.name}</b><br>${store.address}");`,
      )
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { padding: 0; margin: 0; }
            html, body, #map { height: 100%; width: 100%; background: ${theme.colors.surface}; }
            /* Customizing popup to match our theme */
            .leaflet-popup-content-wrapper { border-radius: 12px; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${initialRegion.latitude}, ${initialRegion.longitude}], 13);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19
            }).addTo(map);
            
            ${markersHtml}
          </script>
        </body>
      </html>
    `;
  }, [stores, initialRegion, theme.colors.surface]);

  return (
    <View style={styles.container} testID="store-locator-map">
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.map}
        testID="map-webview"
        scrollEnabled={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};
