import React from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './HomeHeader.styles';

interface HomeHeaderProps {
  navigateToScanner: () => void;
  navigateToAccount: () => void;
  t: (key: string) => string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ navigateToScanner, navigateToAccount, t }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={navigateToScanner} testID="header-scanner-btn">
        <Ionicons name="scan-outline" size={20} color={theme.colors.text} />
      </TouchableOpacity>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchPlaceholder}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          editable={false}
          testID="header-search-input"
        />
      </View>
      
      <TouchableOpacity style={styles.iconButton} onPress={navigateToAccount} testID="header-account-btn">
        <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
};
