import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { useAuthPromptCard } from './useAuthPromptCard';
import { stylesFactory } from './AuthPromptCard.styles';

export const AuthPromptCard: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { isAuthenticated, handleLogout, onSignIn, t } = useAuthPromptCard();

  return (
    <View style={styles.section} testID="auth-prompt-card">
      <Text style={styles.sectionTitle}>{t('profile.account', 'Account')}</Text>
      <View style={styles.optionsList}>
        {isAuthenticated ? (
          <TouchableOpacity
            style={styles.rowLast}
            onPress={handleLogout}
            testID="profile-logout-row"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
              <Text style={[styles.rowText, { color: theme.colors.error }]}>
                {t('profile.signOut', 'Sign Out')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.text + '40'} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.rowLast} onPress={onSignIn} testID="profile-login-row">
            <View style={styles.rowLeft}>
              <Ionicons name="log-in-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.rowText, { color: theme.colors.primary }]}>
                {t('profile.signInRegister', 'Sign In / Register')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.text + '40'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
