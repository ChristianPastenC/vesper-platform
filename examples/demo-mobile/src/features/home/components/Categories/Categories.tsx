import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './Categories.styles';
import { Text } from '../../../../components/Text';

interface CategoriesProps {
  navigateToCatalog: () => void;
  navigateToScanner: () => void;
  navigateToStores: () => void;
  navigateToOrders: () => void;
  t: (key: string) => string;
}

export const Categories: React.FC<CategoriesProps> = ({
  navigateToCatalog,
  navigateToScanner,
  navigateToStores,
  navigateToOrders,
  t,
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.categoriesTitle')}</Text>
      </View>
      <View style={styles.categoriesGrid}>
        <TouchableOpacity
          style={styles.categoryCard}
          onPress={navigateToCatalog}
          testID="action-catalog"
        >
          <Ionicons name="bag-handle-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.categoryText} numberOfLines={1}>
            {t('home.shopOnlineCategory')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.categoryCard}
          onPress={navigateToScanner}
          testID="action-scan"
        >
          <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.categoryText} numberOfLines={1}>
            {t('home.scanAndGo')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.categoryCard}
          onPress={navigateToStores}
          testID="action-stores"
        >
          <Ionicons name="storefront-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.categoryText} numberOfLines={1}>
            {t('home.ourStores')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.categoryCard}
          onPress={navigateToOrders}
          testID="action-orders"
        >
          <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.categoryText} numberOfLines={1}>
            {t('home.myOrders')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
