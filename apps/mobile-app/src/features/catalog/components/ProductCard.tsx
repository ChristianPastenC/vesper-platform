import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { stylesFactory } from './ProductCard.styles';

export interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
}

export interface ProductCardProps {
  product: Product;
  onAddToOnline: (product: Product) => void;
  onAddToInStore: (product: Product) => void;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToOnline,
  onAddToInStore,
  onPress,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} testID="product-card-press" activeOpacity={0.7}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="cube-outline" size={32} color={theme.colors.text + '33'} />
        </View>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.priceTag}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.barcodeTag}>
            <Text style={styles.barcodeText}>Barcode: {product.barcode}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <Button
          title={t('catalog.addToOnline')}
          leftIcon={
            <Ionicons
              name="home-outline"
              size={14}
              color={theme.colors.primary === '#F8FAFC' ? '#09090B' : '#FFFFFF'}
            />
          }
          onPress={() => onAddToOnline(product)}
          style={styles.actionBtn}
        />
        <View style={styles.spacing} />
        <Button
          title={t('catalog.addToInStore')}
          variant="secondary"
          leftIcon={<Ionicons name="barcode-outline" size={14} color={theme.colors.text} />}
          onPress={() => onAddToInStore(product)}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
};
