import React from 'react';
import { FlatList, View } from 'react-native';
import { useTheme } from '../../../core/theme/useTheme';
import { useCatalog } from '../hooks/useCatalog';
import { ProductCard, Product } from '../components/ProductCard';
import { stylesFactory } from './CatalogScreen.styles';

export const CatalogScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { products, handleAddToOnline, handleAddToInStore } = useCatalog();

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onAddToOnline={handleAddToOnline}
      onAddToInStore={handleAddToInStore}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};
