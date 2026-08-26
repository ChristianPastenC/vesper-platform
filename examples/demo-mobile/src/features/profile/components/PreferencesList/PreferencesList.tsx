import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { usePreferencesList } from './usePreferencesList';
import { stylesFactory } from './PreferencesList.styles';

export const PreferencesList: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { toggleThemeMode, toggleLanguage, themeLabel, languageLabel, t } = usePreferencesList();

  return (
    <View style={styles.section} testID="preferences-list">
      <Text style={styles.sectionTitle}>{t('shared_ui.theme', 'Preferences')}</Text>
      <View style={styles.optionsList}>
        <TouchableOpacity style={styles.row} onPress={toggleThemeMode} testID="profile-theme-row">
          <View style={styles.rowLeft}>
            <Ionicons name="color-palette-outline" size={22} color={theme.colors.text} />
            <Text style={styles.rowText}>{t('shared_ui.theme', 'Theme')}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowValueText}>{themeLabel}</Text>
            <Ionicons name="sync-outline" size={16} color={theme.colors.text + '40'} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowLast} onPress={toggleLanguage} testID="profile-lang-row">
          <View style={styles.rowLeft}>
            <Ionicons name="globe-outline" size={22} color={theme.colors.text} />
            <Text style={styles.rowText}>{t('shared_ui.language', 'Language')}</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowValueText}>{languageLabel}</Text>
            <Ionicons name="sync-outline" size={16} color={theme.colors.text + '40'} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
