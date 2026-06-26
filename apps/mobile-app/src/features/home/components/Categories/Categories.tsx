import React from 'react';
import { View, TouchableOpacity, Text as RNText } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './Categories.styles';

interface CategoriesProps {
  navigateToCatalog: () => void;
  navigateToScanner: () => void;
  t: (key: string) => string;
}

export const Categories: React.FC<CategoriesProps> = ({ navigateToCatalog, navigateToScanner, t }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <RNText style={styles.sectionTitle}>{t('home.categoriesTitle')}</RNText>
      </View>
      <View style={styles.categoriesGrid}>
        <TouchableOpacity style={styles.categoryCard} onPress={navigateToCatalog} testID="action-catalog">
          <Ionicons name="bag-handle-outline" size={24} color={theme.colors.primary} />
          <RNText style={styles.categoryText} numberOfLines={1}>{t('home.shopOnline')}</RNText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.categoryCard} onPress={navigateToScanner} testID="action-scan">
          <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
          <RNText style={styles.categoryText} numberOfLines={1}>{t('home.scanAndGo')}</RNText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.categoryCard}>
          <Ionicons name="storefront-outline" size={24} color={theme.colors.primary} />
          <RNText style={styles.categoryText} numberOfLines={1}>{t('home.ourStores')}</RNText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.categoryCard}>
          <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
          <RNText style={styles.categoryText} numberOfLines={1}>{t('home.myOrders')}</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
};
