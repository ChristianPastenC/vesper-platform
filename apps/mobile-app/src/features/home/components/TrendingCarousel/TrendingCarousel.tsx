import React from 'react';
import { View, ScrollView, TouchableOpacity, Text as RNText } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './TrendingCarousel.styles';

interface TrendingCarouselProps {
  products: Array<{ id: string; name: string; price: string }>;
  t: (key: string) => string;
}

export const TrendingCarousel: React.FC<TrendingCarouselProps> = ({ products, t }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <RNText style={styles.sectionTitle}>{t('home.trendingTitle')}</RNText>
        <TouchableOpacity>
          <RNText style={styles.seeAllText}>{t('home.seeAll')}</RNText>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.transactionsList}
      >
        {products.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <RNText style={styles.productName} numberOfLines={2}>{product.name}</RNText>
            <RNText style={styles.productPrice}>{product.price}</RNText>
            <View style={styles.productFooter}>
              <View style={styles.cartIconContainer}>
                <Ionicons name="cart-outline" size={14} color={theme.colors.textSecondary} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
