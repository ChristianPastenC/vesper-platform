import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useCatalog } from '../hooks/useCatalog';
import { RootStackParamList, TabParamList } from '../../../navigation/types';
import { useAppStore } from '../../../store/useAppStore';
import { stylesFactory } from './CatalogScreen.styles';
import { CatalogHeader } from '../components/CatalogHeader/CatalogHeader';
import { ProductGrid } from '../components/ProductGrid/ProductGrid';
import { Text } from '../../../components/Text';

type NavigationProp = StackNavigationProp<RootStackParamList & TabParamList>;

export const CatalogScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp>();
  const onlineCart = useAppStore((state) => state.onlineCart);
  const cartItemsCount = onlineCart.reduce((acc, item) => acc + item.quantity, 0);
  const { t, i18n } = useTranslation();
  const isEs = i18n?.language?.startsWith('es');

  const [selectedCategory, setSelectedCategory] = React.useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const { products, loading, error, isEmpty, refetch } = useCatalog(selectedCategory, 20);

  const filteredProducts = React.useMemo(() => {
    if (!searchQuery) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) || (p.barcode && p.barcode.includes(lowerQuery)),
    );
  }, [products, searchQuery]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const CATEGORIES = [
    { id: 'electronics', name: isEs ? 'Tecnología' : 'Electronics', icon: 'hardware-chip-outline' },
    { id: 'jewelery', name: isEs ? 'Joyería' : 'Jewelry', icon: 'diamond-outline' },
    { id: "men's clothing", name: isEs ? 'Hombre' : "Men's", icon: 'man-outline' },
    { id: "women's clothing", name: isEs ? 'Mujer' : "Women's", icon: 'woman-outline' },
  ];

  const renderListHeader = () => (
    <View>
      {/* 1. PRESTIGIOUS HEADER ROW */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.profileButton} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={32} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconCircleButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('OnlineCart')}
            style={styles.iconCircleButton}
            activeOpacity={0.7}
            testID="header-cart-button"
          >
            <Ionicons name="cart-outline" size={20} color={theme.colors.text} />
            {cartItemsCount > 0 && (
              <View style={styles.badgeContainer} testID="header-cart-badge">
                <Text style={styles.badgeText}>{cartItemsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. SEARCH & SCAN INTEGRATION BAR */}
      <CatalogHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* 3. COUTURIER STORIES / ROUND CATEGORIES */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryItem}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(isSelected ? undefined : cat.id)}
              >
                <View
                  style={[
                    styles.categoryOuterRing,
                    isSelected && { borderColor: theme.colors.primary },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryInnerCircle,
                      isSelected && { backgroundColor: theme.colors.primary + '1A' },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={isSelected ? theme.colors.primary : theme.colors.text}
                    />
                  </View>
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && { color: theme.colors.primary, fontWeight: '600' },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. SEAMLESS TRANSITION TO THE GRID */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>{t('catalog.trendingTitle')}</Text>
        <TouchableOpacity
          style={styles.seeAllButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ProductList', { category: undefined })}
          testID="see-all-button"
        >
          <Text style={styles.seeAllText}>{t('catalog.seeAll')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ProductGrid
        products={filteredProducts}
        loading={loading}
        error={error}
        isEmpty={isEmpty || (filteredProducts.length === 0 && !loading)}
        refetch={refetch}
        ListHeaderComponent={renderListHeader}
      />
    </View>
  );
};
