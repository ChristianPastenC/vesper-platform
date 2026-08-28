import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../core/theme/useTheme';
import { Text } from '../Text';
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

// The image placeholder card keeps a fixed light background regardless of the
// active app theme (see ProductCard.styles.ts), so fallback content must use a
// fixed neutral tone here too — theme.colors.text flips to near-white in dark
// mode and becomes nearly invisible against that background.
const FALLBACK_ICON_COLOR = '#94A3B8';

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

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToOnline, onPress }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} testID="product-card-press" activeOpacity={0.7}>
        <View style={styles.imagePlaceholder}>
          {product.image && !imageError ? (
            <>
              {imageLoading && (
                <View style={styles.skeletonOverlay}>
                  <SkeletonPlaceholder color={theme.colors.border} />
                </View>
              )}
              <Image
                testID="product-card-image"
                source={{ uri: product.image }}
                style={styles.image}
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            </>
          ) : (
            <View testID="product-card-image-fallback" style={styles.imageFallback}>
              <Ionicons name="image-outline" size={28} color={FALLBACK_ICON_COLOR} />
              {imageError && (
                <Text style={styles.imageFallbackText} numberOfLines={1}>
                  {product.name}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={() => onAddToOnline(product)}
            testID="product-card-add-btn"
          >
            <Ionicons name="cart" size={18} color="#FFFFFF" />
          </TouchableOpacity>
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
            <Text style={styles.barcodeText}>EAN: {formatEan13(product.barcode)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};
