import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme/useTheme';
import { useProductDetails } from '../hooks/useProductDetails';
import { stylesFactory } from './ProductDetailsScreen.styles';
import { ProductHero } from '../components/ProductHero/ProductHero';
import { ProductSpecs } from '../components/ProductSpecs/ProductSpecs';
import { AddToCartFooter } from '../components/AddToCartFooter/AddToCartFooter';

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
      headerBackTitleVisible: false,
    });
  }, [navigation, t]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        testID="product-details-scroll"
        showsVerticalScrollIndicator={false}
      >
        <ProductHero name={product.name} price={product.price} barcode={product.barcode} />

        <View style={styles.contentPadding}>
          <ProductSpecs specifications={specifications} />
        </View>
      </ScrollView>

      {/* Sticky footer at the bottom of the screen */}
      <AddToCartFooter onAddToOnline={handleAddToOnline} onAddToInStore={handleAddToInStore} />
    </View>
  );
};
