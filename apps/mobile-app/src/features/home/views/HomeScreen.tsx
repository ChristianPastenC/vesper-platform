import React from 'react';
import { View, ScrollView, TouchableOpacity, Text as RNText } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHome } from '../hooks/useHome';
import { Text } from '../../../components/Text';
import { Button } from '../../../components/Button';
import { useAppStore } from '../../../store/useAppStore';
import { stylesFactory } from './HomeScreen.styles';

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<any>();
  const onlineCart = useAppStore((state) => state.onlineCart);
  const cartItemsCount = onlineCart.reduce((acc, item) => acc + item.quantity, 0);

  const {
    t,
    userName,
    isAuthenticated,
    isOnline,
    toggleNetwork,
    navigateToCatalog,
    navigateToOnlineCart,
    navigateToScanner,
    navigateToAccount,
  } = useHome();

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
              <RNText style={styles.badgeText}>
                {cartItemsCount}
              </RNText>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, cartItemsCount, theme.colors.primary, styles]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <View>
          <Text variant="title" style={styles.welcomeTitle}>
            {isAuthenticated ? `Hello, ${userName}!` : 'Hello, Guest!'}
          </Text>
          <Text variant="caption" style={styles.welcomeSubtitle}>
            Welcome to Sovereign Retail
          </Text>
        </View>
        <TouchableOpacity onPress={navigateToAccount} testID="home-avatar-btn">
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={24} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bannerCard}>
        <Text variant="bold" style={styles.bannerTitle}>
          Dual-Mode Retail Experience
        </Text>
        <Text variant="caption" style={styles.bannerText}>
          Shop online for home delivery, or scan items directly in-store for
          autonomous checkout with Scan & Go.
        </Text>
      </View>

      <Text variant="bold" style={styles.sectionTitle}>
        Quick Actions
      </Text>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          onPress={navigateToCatalog}
          style={styles.actionCard}
          testID="action-catalog"
        >
          <View style={[styles.iconContainer, styles.purpleBg]}>
            <Ionicons name="grid" size={24} color="#FFFFFF" />
          </View>
          <Text variant="bold" style={styles.actionLabel}>
            Catalog
          </Text>
          <Text variant="caption" style={styles.actionDesc}>
            Browse items
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={navigateToOnlineCart}
          style={styles.actionCard}
          testID="action-cart"
        >
          <View style={[styles.iconContainer, styles.blueBg]}>
            <Ionicons name="cart" size={24} color="#FFFFFF" />
          </View>
          <Text variant="bold" style={styles.actionLabel}>
            Online Cart
          </Text>
          <Text variant="caption" style={styles.actionDesc}>
            Ship to home
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          onPress={navigateToScanner}
          style={styles.actionCard}
          testID="action-scan"
        >
          <View style={[styles.iconContainer, styles.greenBg]}>
            <Ionicons name="barcode" size={24} color="#FFFFFF" />
          </View>
          <Text variant="bold" style={styles.actionLabel}>
            Scan & Go
          </Text>
          <Text variant="caption" style={styles.actionDesc}>
            In-store scan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={navigateToAccount}
          style={styles.actionCard}
          testID="action-account"
        >
          <View style={[styles.iconContainer, styles.orangeBg]}>
            <Ionicons name="settings" size={24} color="#FFFFFF" />
          </View>
          <Text variant="bold" style={styles.actionLabel}>
            Settings
          </Text>
          <Text variant="caption" style={styles.actionDesc}>
            Manage account
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.networkWidget}>
        <View style={styles.networkHeader}>
          <Ionicons
            name={isOnline ? 'wifi' : 'wifi-outline'}
            size={20}
            color={isOnline ? theme.colors.success : theme.colors.error}
          />
          <Text variant="bold" style={styles.networkTitle}>
            {t('shared_ui.networkIndicator')}
          </Text>
        </View>
        <Text variant="caption" style={styles.networkDesc}>
          Simulate connectivity inside store dead spots.
        </Text>
        <Button
          title={
            isOnline
              ? t('scan_and_go.onlineLabel')
              : t('scan_and_go.offlineLabel')
          }
          variant="secondary"
          onPress={toggleNetwork}
          style={styles.networkBtn}
          testID="home-network-toggle"
        />
      </View>
    </ScrollView>
  );
};
