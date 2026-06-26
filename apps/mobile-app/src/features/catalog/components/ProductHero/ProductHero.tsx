import React, { useState, useEffect, useRef } from 'react';
import { View, Image, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './ProductHero.styles';

const getProductIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('headphone')) return 'headset-outline';
  if (lowerName.includes('keyboard')) return 'keypad-outline';
  if (lowerName.includes('mouse')) return 'hand-left-outline';
  if (lowerName.includes('watch')) return 'watch-outline';
  if (lowerName.includes('hub') || lowerName.includes('adapter')) return 'hardware-chip-outline';
  return 'cube-outline';
};

interface ProductHeroProps {
  name: string;
  price: number;
  barcode: string;
  image?: string;
}

export const ProductHero: React.FC<ProductHeroProps> = ({ name, price, barcode, image }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { t } = useTranslation();
  
  const [imageLoading, setImageLoading] = useState(true);
  const animValue = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (imageLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      animValue.setValue(1);
    }
  }, [imageLoading, animValue]);

  return (
    <View style={styles.heroContainer} testID="product-hero-container">
      <View style={styles.imageContainer} testID="product-image-container">
        
        {image ? (
          <>
            <Image
              source={{ uri: image }}
              style={[{ width: '100%', height: '100%', resizeMode: 'cover' }]}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
            {imageLoading && (
              <Animated.View style={[styles.skeletonOverlay, { opacity: animValue, backgroundColor: theme.colors.border }]}>
                <Ionicons name="image-outline" size={48} color={theme.colors.text} style={styles.skeletonIcon} />
              </Animated.View>
            )}
          </>
        ) : (
          <Ionicons name={getProductIcon(name)} size={160} color={theme.colors.primary} style={{ opacity: 0.5 }} />
        )}
        
        <View style={styles.gradientOverlay} />

        <View style={styles.contentOverlay}>
          <Text style={styles.title}>
            {name}
          </Text>
          <Text style={styles.price} testID="product-details-price">
            ${price.toFixed(2)}
          </Text>

          <View style={styles.barcodeContainer}>
            <Ionicons name="barcode-outline" size={14} color="#FFFFFF" />
            <Text style={styles.barcodeText} testID="product-details-barcode">
              {t('catalog.ean')}: {barcode}
            </Text>
          </View>
        </View>

      </View>
    </View>
  );
};
