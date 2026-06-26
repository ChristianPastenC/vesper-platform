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

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();
  
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
    TRENDING_PRODUCTS
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader 
          navigateToScanner={navigateToScanner}
          navigateToAccount={navigateToAccount}
          t={t}
        />

        <HeroBanner 
          isAuthenticated={isAuthenticated}
          userName={userName}
          navigateToAccount={navigateToAccount}
          t={t}
        />

        <SyncAlert 
          isFrozen={isFrozen}
          toggleNetwork={toggleNetwork}
          t={t}
        />

        <Categories 
          navigateToCatalog={navigateToCatalog}
          navigateToScanner={navigateToScanner}
          t={t}
        />

        <TrendingCarousel 
          products={TRENDING_PRODUCTS}
          t={t}
        />
      </ScrollView>
    </View>
  );
};
