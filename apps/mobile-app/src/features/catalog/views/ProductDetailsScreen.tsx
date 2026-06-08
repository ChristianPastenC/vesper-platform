import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { useProductDetails } from '../hooks/useProductDetails';
import { stylesFactory } from './ProductDetailsScreen.styles';

const getProductIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('headphone')) return 'headset-outline';
  if (lowerName.includes('keyboard')) return 'keypad-outline';
  if (lowerName.includes('mouse')) return 'hand-left-outline';
  if (lowerName.includes('watch')) return 'watch-outline';
  if (lowerName.includes('hub') || lowerName.includes('adapter')) return 'hardware-chip-outline';
  return 'cube-outline';
};

export const ProductDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation();

  const { product, handleAddToOnline, handleAddToInStore, specifications } = useProductDetails();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: t('catalog.productDetails'),
    });
  }, [navigation, t]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} testID="product-details-scroll">
        <View style={styles.imageContainer} testID="product-image-container">
          <Ionicons name={getProductIcon(product.name)} size={80} color={theme.colors.primary} />
        </View>

        <View style={styles.header}>
          <Text variant="bold" style={styles.title}>
            {product.name}
          </Text>
          <Text variant="subtitle" style={styles.price} testID="product-details-price">
            ${product.price.toFixed(2)}
          </Text>
        </View>

        <View style={styles.barcodeContainer}>
          <Ionicons name="barcode-outline" size={16} color={theme.colors.text} />
          <Text variant="caption" style={styles.barcodeText} testID="product-details-barcode">
            {product.barcode}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="bold" style={styles.sectionTitle}>
            {t('catalog.descriptionTitle')}
          </Text>
          <Text variant="body" style={styles.descriptionText} testID="product-details-description">
            {t('catalog.mockDescription')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="bold" style={styles.sectionTitle}>
            {t('catalog.specificationsTitle')}
          </Text>
          <View style={styles.specsTable} testID="product-specs-table">
            {specifications.map((spec, index) => {
              const isLast = index === specifications.length - 1;
              return (
                <View
                  key={spec.labelKey}
                  style={isLast ? styles.specRowLast : styles.specRow}
                  testID={`spec-row-${index}`}
                >
                  <Text variant="bold" style={styles.specLabel}>
                    {t(spec.labelKey)}
                  </Text>
                  <Text variant="body" style={styles.specValue}>
                    {spec.isTranslationValue ? t(spec.value) : spec.value}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={t('catalog.addToOnline')}
            leftIcon={<Ionicons name="home-outline" size={18} color="#FFFFFF" />}
            onPress={handleAddToOnline}
            style={styles.actionBtn}
            testID="details-add-online-btn"
          />
          <View style={styles.spacing} />
          <Button
            title={t('catalog.addToInStore')}
            variant="secondary"
            leftIcon={<Ionicons name="barcode-outline" size={18} color={theme.colors.primary} />}
            onPress={handleAddToInStore}
            style={styles.actionBtn}
            testID="details-add-instore-btn"
          />
        </View>
      </ScrollView>
    </View>
  );
};
