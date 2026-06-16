import React from 'react';
import { FlatList, View, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSovereignCatalog } from '../hooks/useSovereignCatalog';
import { ProductCard, Product } from '../components/ProductCard';
import { RootStackParamList, TabParamList } from '../../../navigation/types';
import { useAppStore } from '../../../store/useAppStore';
import { stylesFactory } from './CatalogScreen.styles';

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

  const { products, loading, error, isEmpty, refetch } = useSovereignCatalog();
  const addToOnlineCart = useAppStore((state) => state.addToOnlineCart);
  const addToInStoreCart = useAppStore((state) => state.addToInStoreCart);

  const handleAddToOnline = (product: Product) => {
    addToOnlineCart({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  };

  const handleAddToInStore = (product: Product) => {
    addToInStoreCart({
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      price: product.price,
    });
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const CATEGORIES = [
    { id: 'new', name: isEs ? 'Novedades' : 'New In', icon: 'sparkles-outline' },
    { id: 'apparel', name: isEs ? 'Moda' : 'Apparel', icon: 'shirt-outline' },
    { id: 'footwear', name: isEs ? 'Calzado' : 'Footwear', icon: 'walk-outline' },
    { id: 'accessories', name: isEs ? 'Accesorios' : 'Accessories', icon: 'watch-outline' },
    { id: 'tech', name: isEs ? 'Tech' : 'Tech', icon: 'hardware-chip-outline' },
  ];

  const renderListHeader = () => (
    <View>
      {/* 1. PRESTIGIOUS HEADER ROW */}
      <View style={styles.headerContainer}>
        <Text style={styles.brandName}>Sovereign</Text>
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
      <View style={styles.searchBarContainer}>
        <Ionicons
          name="search-outline"
          size={18}
          color={theme.colors.text + '80'}
          style={styles.searchIcon}
        />
        <Text style={styles.searchPlaceholderText}>{t('catalog.searchPlaceholder')}</Text>
        <View style={styles.searchSeparator} />
        <TouchableOpacity
          onPress={() => navigation.navigate('ScanAndGoTab')}
          style={styles.scanTriggerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="barcode-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 3. COUTURIER STORIES / ROUND CATEGORIES */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.categoryItem}>
              <View style={styles.categoryOuterRing}>
                <View style={styles.categoryInnerCircle}>
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={22} color={theme.colors.text} />
                </View>
              </View>
              <Text style={styles.categoryText} numberOfLines={1}>
                {cat.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 4. HERO PROMOTIONAL BANNER */}
      <View style={styles.heroBanner}>
        <View style={styles.heroMicroCapsule}>
          <Text style={styles.heroMicroText}>{t('catalog.heroTag')}</Text>
        </View>
        <Text style={styles.heroTitle}>{t('catalog.heroTitle')}</Text>
        <Text style={styles.heroSubText}>{t('catalog.heroSubText')}</Text>
      </View>

      {/* 5. SEAMLESS TRANSITION TO THE GRID */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>{t('catalog.trendingTitle')}</Text>
        <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>{t('catalog.seeAll')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : error ? (
            <TouchableOpacity onPress={() => refetch()} style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.error || 'red', textAlign: 'center' }}>
                Failed to load catalog. Tap to retry.
              </Text>
            </TouchableOpacity>
          ) : isEmpty ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text, textAlign: 'center' }}>
                No products found.
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};
