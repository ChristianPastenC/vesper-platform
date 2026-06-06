import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToOnline,
  onAddToInStore,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="bold" style={styles.name}>
          {product.name}
        </Text>
        <Text variant="subtitle" style={styles.price}>
          ${product.price.toFixed(2)}
        </Text>
      </View>
      <Text variant="caption" style={styles.barcode}>
        Barcode: {product.barcode}
      </Text>
      <View style={styles.actions}>
        <Button
          title={t('catalog.addToOnline')}
          onPress={() => onAddToOnline(product)}
          style={styles.actionBtn}
        />
        <View style={styles.spacing} />
        <Button
          title={t('catalog.addToInStore')}
          variant="secondary"
          onPress={() => onAddToInStore(product)}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
};
