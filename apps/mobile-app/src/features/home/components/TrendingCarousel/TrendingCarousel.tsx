import React from 'react';
import { View, ScrollView, TouchableOpacity, Text as RNText } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './TrendingCarousel.styles';

import { Product, ProductCard } from '../../../../components/ProductCard/ProductCard';

interface TrendingCarouselProps {
  products: Array<Product>;
  t: (key: string) => string;
  onSeeAll?: () => void;
  onAddToOnline?: (product: Product) => void;
  onProductPress?: (product: Product) => void;
}

export const TrendingCarousel: React.FC<TrendingCarouselProps> = ({ products, t, onSeeAll, onAddToOnline, onProductPress }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <RNText style={styles.sectionTitle}>{t('home.trendingTitle')}</RNText>
        <TouchableOpacity onPress={onSeeAll}>
          <RNText style={styles.seeAllText}>{t('home.seeAll')}</RNText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.transactionsList}
      >
        {products.map((product) => (
          <View key={product.id} style={{ width: 160, marginRight: 16 }}>
            <ProductCard
              product={product}
              onAddToOnline={onAddToOnline || (() => {})}
              onAddToInStore={() => {}} // Usually not for in-store from home
              onPress={() => onProductPress?.(product)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
