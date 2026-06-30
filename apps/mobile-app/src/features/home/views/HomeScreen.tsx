import React from 'react';
import { View, ScrollView, TouchableOpacity, Text as RNText } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme/useTheme';
import { useHomeScreen } from './useHomeScreen';
import { stylesFactory } from './HomeScreen.styles';

import { HomeHeader } from '../components/HomeHeader/HomeHeader';
import { HeroBanner } from '../components/HeroBanner/HeroBanner';
import { SyncAlert } from '../components/SyncAlert/SyncAlert';
import { Categories } from '../components/Categories/Categories';
import { TrendingCarousel } from '../components/TrendingCarousel/TrendingCarousel';
import { PromoCarousel } from '../components/PromoCarousel/PromoCarousel';

import { SearchModal } from '../components/SearchModal/SearchModal';

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();
  const [isSearchVisible, setIsSearchVisible] = React.useState(false);

  const {
    t,
    userName,
    isAuthenticated,
    isFrozen,
    cartItemsCount,
    toggleNetwork,
    navigateToCatalog,
    navigateToScanner,
    navigateToAccount,
    navigateToStores,
    navigateToOrders,
    TRENDING_PRODUCTS,
  } = useHomeScreen();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('OnlineCart')}
          style={styles.headerCartButton}
          testID="header-cart-button"
        >
          <Ionicons name="cart-outline" size={26} color={theme.colors.primary} />
          {cartItemsCount > 0 && (
            <View style={styles.badgeContainer} testID="header-cart-badge">
              <RNText style={styles.badgeText}>{cartItemsCount}</RNText>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, cartItemsCount, styles, theme.colors.primary]);

  return (
    <View style={styles.container}>
      <SearchModal isVisible={isSearchVisible} onClose={() => setIsSearchVisible(false)} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HomeHeader
          navigateToScanner={navigateToScanner}
          navigateToAccount={navigateToAccount}
          onSearchPress={() => setIsSearchVisible(true)}
          t={t}
        />

        <HeroBanner
          isAuthenticated={isAuthenticated}
          navigateToAccount={navigateToAccount}
          navigateToCatalog={navigateToCatalog}
          t={t}
        />

        <SyncAlert isFrozen={isFrozen} toggleNetwork={toggleNetwork} t={t} />

        <Categories
          navigateToCatalog={navigateToCatalog}
          navigateToScanner={navigateToScanner}
          navigateToStores={navigateToStores}
          navigateToOrders={navigateToOrders}
          t={t}
        />

        <PromoCarousel />

        <TrendingCarousel 
          products={TRENDING_PRODUCTS} 
          t={t} 
          onSeeAll={navigateToCatalog} 
        />
      </ScrollView>
    </View>
  );
};
