import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../../core/theme/useTheme';
import { useCatalog } from '../hooks/useCatalog';
import { ProductGrid } from '../components/ProductGrid/ProductGrid';
import { stylesFactory } from './ProductListScreen.styles';
import { RootStackParamList } from '../../../navigation/types';

type ProductListRouteProp = RouteProp<RootStackParamList, 'ProductList'>;

export const ProductListScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation();
  const route = useRoute<ProductListRouteProp>();

  const category = route.params?.category;
  
  // Use existing catalog hook
  const { products, loading, error, isEmpty, refetch } = useCatalog(category, 50);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: category ? t(`catalog.category_${category}`, t('catalog.productListTitle')) : t('catalog.productListTitle'),
      headerBackTitleVisible: false,
    });
  }, [navigation, t, category]);

  return (
    <View style={styles.container} testID="product-list-screen">
      <ProductGrid
        products={products}
        loading={loading}
        error={error}
        isEmpty={isEmpty}
        refetch={refetch}
      />
    </View>
  );
};
