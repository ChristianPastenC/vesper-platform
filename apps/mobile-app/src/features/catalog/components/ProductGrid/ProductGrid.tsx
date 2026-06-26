import React from 'react';
import { View, FlatList, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../core/theme/useTheme';
import { ProductCard, Product } from '../../components/ProductCard';
import { Button } from '../../../../components/Button';
import { stylesFactory } from './ProductGrid.styles';
import { useProductGrid } from './useProductGrid';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  error: Error | null;
  isEmpty: boolean;
  refetch: () => void;
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading,
  error,
  isEmpty,
  refetch,
  ListHeaderComponent,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const { handleAddToOnline, handleAddToInStore, handleProductPress } = useProductGrid();

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onAddToOnline={handleAddToOnline}
      onAddToInStore={handleAddToInStore}
      onPress={() => handleProductPress(item)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4].map((key) => (
                <View key={key} style={styles.skeletonCard} />
              ))}
            </View>
          ) : error ? (
            <View style={styles.emptyStateContainer} testID="error-state">
              <Ionicons
                name="cloud-offline-outline"
                size={48}
                color={theme.colors.error || '#ef4444'}
                style={styles.errorIcon}
              />
              <Text style={styles.errorText}>
                {t('catalog.errorLoad') || 'Failed to load catalog. Please check your connection.'}
              </Text>
              <Button
                title={t('catalog.retry') || 'Retry'}
                onPress={() => refetch()}
                variant="secondary"
              />
            </View>
          ) : isEmpty ? (
            <View style={styles.emptyStateContainer} testID="empty-state">
              <Text style={styles.emptyText}>{t('catalog.empty') || 'No products found.'}</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};
