import React from 'react';
import { View, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './FilterTabs.styles';

interface FilterTabsProps {
  activeTab: 'active' | 'past';
  onTabChange: (tab: 'active' | 'past') => void;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.container} testID="filter-tabs">
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'active' && styles.activeTabButton]}
        onPress={() => onTabChange('active')}
        testID="tab-active"
      >
        <RNText style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
          {t('orders.filterActive')}
        </RNText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
        onPress={() => onTabChange('past')}
        testID="tab-past"
      >
        <RNText style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
          {t('orders.filterPast')}
        </RNText>
      </TouchableOpacity>
    </View>
  );
};
