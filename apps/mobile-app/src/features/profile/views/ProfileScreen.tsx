import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { Text } from '../../../components/Text';
import { ProfileHeader } from '../components/ProfileHeader/ProfileHeader';
import { AuthPromptCard } from '../components/AuthPromptCard/AuthPromptCard';
import { PreferencesList } from '../components/PreferencesList/PreferencesList';
import { stylesFactory } from './ProfileScreen.styles';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} testID="profile-scroll">
      <ProfileHeader />
      <AuthPromptCard />
      <PreferencesList />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.appInfo', 'App Info')}</Text>
        <View style={styles.optionsList}>
          <View style={styles.rowLast} testID="profile-version-row">
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color={theme.colors.text} />
              <Text style={styles.rowText}>{t('profile.version', 'Version')}</Text>
            </View>
            <Text style={styles.rowValueText}>1.0.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
