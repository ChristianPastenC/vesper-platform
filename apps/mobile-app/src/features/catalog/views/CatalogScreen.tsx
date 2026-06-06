import React from 'react';
import { FlatList, View, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useCatalog } from '../hooks/useCatalog';
import { ProductCard, Product } from '../components/ProductCard';
import { RootStackParamList } from '../../../navigation/types';
import { useAppStore } from '../../../store/useAppStore';
import { stylesFactory } from './CatalogScreen.styles';

type NavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export const CatalogScreen: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp>();
  const onlineCart = useAppStore((state) => state.onlineCart);
  const cartItemsCount = onlineCart.reduce((acc, item) => acc + item.quantity, 0);

  const {
    products,
    handleAddToOnline,
    handleAddToInStore,
  } = useCatalog();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('OnlineCart')}
          style={styles.headerCartButton}
          testID="header-cart-button"
        >
          <Ionicons
            name="cart-outline"
            size={26}
            color={theme.colors.primary}
          />
          {cartItemsCount > 0 && (
            <View style={styles.badgeContainer} testID="header-cart-badge">
              <Text style={styles.badgeText}>
                {cartItemsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, cartItemsCount, theme.colors.primary, styles]);

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onAddToOnline={handleAddToOnline}
      onAddToInStore={handleAddToInStore}
      onPress={() => navigation.navigate('ProductDetails', { product: item })}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};
