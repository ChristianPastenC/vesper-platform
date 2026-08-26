import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SearchBar } from '../../../../components/SearchBar/SearchBar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './HomeHeader.styles';

interface HomeHeaderProps {
  navigateToScanner: () => void;
  navigateToAccount: () => void;
  onSearchPress: () => void;
  t: (key: string) => string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  navigateToScanner,
  navigateToAccount,
  onSearchPress,
  t,
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={navigateToScanner}
        testID="header-scanner-btn"
      >
        <Ionicons name="scan-outline" size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <SearchBar
        placeholder={t('home.searchPlaceholder')}
        editable={false}
        onPress={onSearchPress}
        containerStyle={{ flex: 1, marginHorizontal: 12 }}
        testID="header-search-input"
      />

      <TouchableOpacity
        style={styles.iconButton}
        onPress={navigateToAccount}
        testID="header-account-btn"
      >
        <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
};
