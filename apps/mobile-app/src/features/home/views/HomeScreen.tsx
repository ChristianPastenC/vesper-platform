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

  const CURATED_LOOKS = [
    { id: '1', tag: t('home.newArrivals'), title: t('home.collectionTitle') + ' - Vol. I', color: '#0F172A' },
    { id: '2', tag: t('home.newArrivals'), title: t('home.collectionTitle') + ' - Vol. II', color: '#1E293B' },
    { id: '3', tag: t('home.newArrivals'), title: t('home.collectionTitle') + ' - Vol. III', color: '#334155' },
  ];

  const TRANSACTIONS = [
    { id: 'TRX-9482', date: '2026-06-05', amount: '$154.90' },
    { id: 'TRX-3081', date: '2026-06-02', amount: '$42.00' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. EDITORIAL WELCOME & PROFILE HEADER */}
      <View style={styles.header}>
        <View>
          <Text variant="title" style={styles.welcomeTitle}>
            {isAuthenticated ? `Hello, ${userName}!` : 'Hello, Guest!'}
          </Text>
          <View style={styles.welcomeSubtitleRow}>
            <Ionicons name="location-outline" size={13} color={theme.colors.text + '80'} />
            <Text style={styles.welcomeSubtitle}>
              {t('home.location')}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={navigateToAccount}
          testID="home-avatar-btn"
          activeOpacity={0.7}
        >
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={22} color={theme.colors.text} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. PRESTIGE DUAL-ACTION TILES */}
      <View style={styles.dualActionContainer}>
        {/* Left Tile: Catalog / Online Shopping */}
        <TouchableOpacity
          onPress={navigateToCatalog}
          style={styles.tileLeft}
          testID="action-catalog"
          activeOpacity={0.8}
        >
          <View style={styles.tileIconContainerLight}>
            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
          </View>
          <View>
            <RNText style={styles.tileTitleLight}>
              {t('Catalog')}
            </RNText>
            <RNText style={styles.tileSubtitleLight}>
              {t('home.shopOnlineDesc')}
            </RNText>
          </View>
        </TouchableOpacity>

        {/* Right Tile: Scan & Go */}
        <TouchableOpacity
          onPress={navigateToScanner}
          style={styles.tileRight}
          testID="action-scan"
          activeOpacity={0.8}
        >
          <View style={styles.tileIconContainerDark}>
            <Ionicons name="barcode-outline" size={20} color={theme.colors.text} />
          </View>
          <View>
            <RNText style={styles.tileTitleDark}>
              {t('Scan & Go')}
            </RNText>
            <RNText style={styles.tileSubtitleDark}>
              {t('home.scanGoDesc')}
            </RNText>
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. CURATED LOOKS / BRAND HERO CAROUSEL */}
      <View style={styles.carouselContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Curated Looks</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={styles.carouselCard.width + 16}
        >
          {CURATED_LOOKS.map((item) => (
            <View
              key={item.id}
              style={[styles.carouselCard, { backgroundColor: item.color }]}
            >
              <View style={styles.carouselCardOverlay} />
              <View style={styles.carouselPill}>
                <RNText style={styles.carouselPillText}>{item.tag}</RNText>
              </View>
              <RNText style={styles.carouselTitle}>{item.title}</RNText>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 4. RECENT ACTIVITY / SECURE TRANSACTIONS SNAPSHOT */}
      <View style={styles.transactionList}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>{t('home.recentActivity')}</Text>
          <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {TRANSACTIONS.map((trx) => (
          <View key={trx.id} style={styles.transactionRow}>
            <View style={styles.transactionPlaceholder}>
              <Ionicons name="receipt-outline" size={20} color={theme.colors.text + '80'} />
            </View>
            <View style={styles.transactionInfo}>
              <RNText style={styles.transactionId}>{trx.id}</RNText>
              <RNText style={styles.transactionDate}>{trx.date}</RNText>
            </View>
            <RNText style={styles.transactionAmount}>{trx.amount}</RNText>
          </View>
        ))}
      </View>

      {/* 5. CONNECTIVITY DIAGNOSTICS WIDGET */}
      <View style={styles.networkWidget}>
        <View style={styles.networkHeader}>
          <Ionicons
            name={isOnline ? 'wifi' : 'wifi-outline'}
            size={18}
            color={isOnline ? theme.colors.success : theme.colors.error}
          />
          <Text style={styles.networkTitle}>
            {t('home.networkWidgetTitle')}
          </Text>
        </View>
        <Text variant="caption" style={styles.networkDesc}>
          {t('home.networkWidgetDesc')}
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
