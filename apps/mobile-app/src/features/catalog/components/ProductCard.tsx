import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Animated } from 'react-native';
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
  image?: string;
}

export interface ProductCardProps {
  product: Product;
  onAddToOnline: (product: Product) => void;
  onAddToInStore: (product: Product) => void;
  onPress: () => void;
}

// Extract logic: Format barcode as EAN-13 roughly (e.g. 1 234567 890123) if it's 13 digits
const formatEan13 = (bc: string) => {
  if (bc.length === 13) {
    return `${bc.slice(0, 1)} ${bc.slice(1, 7)} ${bc.slice(7)}`;
  }
  return bc;
};

const SkeletonPlaceholder = ({ color }: { color: string }) => {
  const animValue = React.useRef(new Animated.Value(0.5)).current;
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [animValue]);

  return (
    <Animated.View
      style={[styles.skeletonContainer, { opacity: animValue, backgroundColor: color }]}
    >
      <Ionicons name="image-outline" size={32} color={color} style={styles.skeletonIcon} />
    </Animated.View>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToOnline,
  onAddToInStore,
  onPress,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} testID="product-card-press" activeOpacity={0.7}>
        <View style={styles.imagePlaceholder}>
          {product.image ? (
            <>
              {imageLoading && (
                <View style={styles.skeletonOverlay}>
                  <SkeletonPlaceholder color={theme.colors.border} />
                </View>
              )}
              <Image
                source={{ uri: product.image }}
                style={styles.image}
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            </>
          ) : (
            <Ionicons name="cube-outline" size={32} color={theme.colors.text + '33'} />
          )}
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
            <Text style={styles.barcodeText}>Barcode: {formatEan13(product.barcode)}</Text>
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
