import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme/useTheme';
import { Text } from '../../../components/Text';
import { StoreLocatorMap } from '../components/StoreLocatorMap/StoreLocatorMap';
import { StoreCard } from '../components/StoreCard/StoreCard';
import { useStoresScreen } from './useStoresScreen';
import { stylesFactory } from './StoresScreen.styles';

export const StoresScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const { t, stores, isLoading, error, handleRoutePress } = useStoresScreen();

  return (
    <View style={styles.container} testID="stores-screen">
      <View style={styles.header}>
        <Text style={styles.title}>{t('stores.title', 'Our Stores')}</Text>
      </View>

      <View style={styles.mapContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : error ? (
          <Text style={{ textAlign: 'center', padding: 20 }}>
            {t('stores.error', 'Failed to load map')}
          </Text>
        ) : (
          <StoreLocatorMap />
        )}
      </View>

      <ScrollView style={styles.listContainer}>
        <Text style={styles.listTitle}>{t('stores.nearby', 'Nearby Locations')}</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : error ? (
          <Text style={{ textAlign: 'center', padding: 20 }}>
            {t('stores.error', 'Failed to load locations')}
          </Text>
        ) : (
          stores.map((store) => (
            <StoreCard
              key={store.id}
              id={store.id}
              name={store.name}
              distance={store.distance}
              hours={store.hours}
              address={store.address}
              onPressRoute={() => handleRoutePress(store.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};
