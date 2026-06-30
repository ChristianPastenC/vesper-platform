import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './CatalogHeader.styles';
import { SearchBar } from '../../../../components/SearchBar/SearchBar';

interface CatalogHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
}

export const CatalogHeader: React.FC<CatalogHeaderProps> = ({ searchQuery, onSearchChange }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  const scanButton = (
    <TouchableOpacity
      onPress={() => navigation.navigate('ScanAndGoTab')}
      style={styles.scanTriggerButton}
      activeOpacity={0.7}
      testID="scan-button"
    >
      <Ionicons name="barcode-outline" size={20} color={theme.colors.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: 24 }} testID="catalog-header-container">
      <SearchBar
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder={t('catalog.searchPlaceholder')}
        rightElement={scanButton}
      />
    </View>
  );
};
