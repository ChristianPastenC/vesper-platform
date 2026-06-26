import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './CatalogHeader.styles';

export const CatalogHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.searchBarContainer} testID="catalog-header-container">
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
        testID="scan-button"
      >
        <Ionicons name="barcode-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
};
