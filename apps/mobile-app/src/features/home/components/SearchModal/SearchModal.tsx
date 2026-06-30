import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../../../../core/theme/useTheme';
import { SearchBar } from '../../../../components/SearchBar/SearchBar';
import { useSovereignCatalog } from '../../../catalog/hooks/useSovereignCatalog';
import { Product } from '../../../catalog/domain/product.entity';
import { stylesFactory } from './SearchModal.styles';

interface SearchModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isVisible, onClose }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const navigation = useNavigation<NavigationProp<any>>();
  const searchInputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Use the catalog hook without category to fetch all products
  const { products, loading } = useSovereignCatalog(undefined, 50);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return []; // don't show all products by default, wait for typing
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.barcode && p.barcode.includes(lowerQuery))
    );
  }, [products, searchQuery]);

  // Reset state and focus input when modal opens
  useEffect(() => {
    if (isVisible) {
      setSearchQuery('');
      // Small delay to ensure modal is rendered before focusing
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const handleProductPress = (product: Product) => {
    onClose();
    navigation.navigate('ProductDetails', { product });
  };

  const renderResultItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.resultItem}
      activeOpacity={0.7}
      onPress={() => handleProductPress(item)}
      testID={`search-result-${item.id}`}
    >
      <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.resultIcon} />
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        {item.barcode && (
          <Text style={styles.resultBarcode}>
            {t('catalog.ean') || 'EAN:'} {item.barcode}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} testID="close-search-modal">
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.searchBarWrapper}>
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('home.searchPlaceholder')}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.content}>
          {loading && !products.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              renderItem={renderResultItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                searchQuery.trim().length > 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={48} color={theme.colors.textSecondary + '50'} />
                    <Text style={styles.emptyText}>{t('catalog.emptySearch') || 'No results found'}</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};
