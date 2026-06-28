import React from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { useProfileHeader } from './useProfileHeader';
import { stylesFactory } from './ProfileHeader.styles';

export const ProfileHeader: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { isAuthenticated, userName, initial, t } = useProfileHeader();

  return (
    <View style={styles.headerCard} testID="profile-header-card">
      <View style={styles.avatarContainer} testID="profile-avatar">
        {isAuthenticated && userName ? (
          <Text variant="bold" style={styles.avatarText}>
            {initial}
          </Text>
        ) : (
          <Ionicons name="person-outline" size={28} color={theme.colors.primary} />
        )}
      </View>
      <View style={styles.headerInfo}>
        <Text variant="bold" style={styles.welcomeText} testID="profile-greeting">
          {isAuthenticated
            ? `${t('auth.title', 'Welcome')}, ${userName}!`
            : t('profile.greetingGuest', 'Hello, Guest!')}
        </Text>
        <Text style={styles.statusText} testID="profile-status">
          {isAuthenticated
            ? t('profile.sessionActive', 'Session Active')
            : t('profile.signInPrompt', 'Sign in to unlock checkout features')}
        </Text>
      </View>
    </View>
  );
};
