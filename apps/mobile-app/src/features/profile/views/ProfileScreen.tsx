import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../core/theme/useTheme';
import { useProfile } from '../hooks/useProfile';
import { Text } from '../../../components/Text';
import { stylesFactory } from './ProfileScreen.styles';

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);
  const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();

  const {
    isAuthenticated,
    userName,
    themeMode,
    toggleThemeMode,
    language,
    toggleLanguage,
    handleLogout,
    t,
  } = useProfile();

  const getThemeLabel = (mode: string) => {
    if (mode === 'light') return t('shared_ui.themeLight') || 'Light';
    if (mode === 'dark') return t('shared_ui.themeDark') || 'Dark';
    return t('shared_ui.themeSystem') || 'System';
  };

  const getLanguageLabel = (lang: string) => {
    return lang === 'en' ? 'English' : 'Español';
  };

  return (
    <ScrollView style={styles.container} testID="profile-scroll">
      {/* Header Greeting Card */}
      <View style={styles.headerCard} testID="profile-header-card">
        <View style={styles.avatarContainer} testID="profile-avatar">
          {isAuthenticated && userName ? (
            <Text variant="bold" style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Ionicons name="person-outline" size={28} color={theme.colors.primary} />
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text variant="bold" style={styles.welcomeText} testID="profile-greeting">
            {isAuthenticated ? `${t('auth.title') || 'Welcome'}, ${userName}!` : 'Hello, Guest!'}
          </Text>
          <Text style={styles.statusText} testID="profile-status">
            {isAuthenticated ? 'Session Active' : 'Sign in to unlock checkout features'}
          </Text>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.optionsList}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.rowLast}
              onPress={handleLogout}
              testID="profile-logout-row"
            >
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
                <Text style={[styles.rowText, { color: theme.colors.error }]}>Sign Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.text + '40'} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.rowLast}
              onPress={() => navigation.navigate('Login')}
              testID="profile-login-row"
            >
              <View style={styles.rowLeft}>
                <Ionicons name="log-in-outline" size={22} color={theme.colors.primary} />
                <Text style={[styles.rowText, { color: theme.colors.primary }]}>
                  Sign In / Register
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.text + '40'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('shared_ui.theme') || 'Preferences'}</Text>
        <View style={styles.optionsList}>
          <TouchableOpacity style={styles.row} onPress={toggleThemeMode} testID="profile-theme-row">
            <View style={styles.rowLeft}>
              <Ionicons name="color-palette-outline" size={22} color={theme.colors.text} />
              <Text style={styles.rowText}>{t('shared_ui.theme')}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValueText}>{getThemeLabel(themeMode)}</Text>
              <Ionicons name="sync-outline" size={16} color={theme.colors.text + '40'} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowLast}
            onPress={toggleLanguage}
            testID="profile-lang-row"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={22} color={theme.colors.text} />
              <Text style={styles.rowText}>{t('shared_ui.language')}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValueText}>{getLanguageLabel(language)}</Text>
              <Ionicons name="sync-outline" size={16} color={theme.colors.text + '40'} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.optionsList}>
          <View style={styles.rowLast} testID="profile-version-row">
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color={theme.colors.text} />
              <Text style={styles.rowText}>Version</Text>
            </View>
            <Text style={styles.rowValueText}>1.0.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
