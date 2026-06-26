import React from 'react';
import { View, TouchableOpacity, Text as RNText } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './HeroBanner.styles';

interface HeroBannerProps {
  isAuthenticated: boolean;
  userName: string | null;
  navigateToAccount: () => void;
  t: (key: string) => string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ isAuthenticated, userName, navigateToAccount, t }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.heroContainer}>
      {isAuthenticated ? (
        <View style={styles.heroCardAuth} testID="hero-auth-card">
          <RNText style={styles.heroTitleAuth}>{t('home.promoTitle')}</RNText>
          <RNText style={styles.heroSubtitleAuth}>{t('home.promoSubtitle')}</RNText>
          <TouchableOpacity style={styles.heroButton} activeOpacity={0.8} testID="hero-vault-btn">
            <RNText style={styles.heroButtonText}>{t('home.shopNow')}</RNText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.heroCardUnauth} testID="hero-unauth-card">
          <RNText style={styles.heroTitleUnauth}>{t('home.welcomeTitleGuest')}</RNText>
          <RNText style={styles.heroSubtitleUnauth}>{t('home.loginPrompt')}</RNText>
          <TouchableOpacity style={styles.heroButtonUnauth} onPress={navigateToAccount} activeOpacity={0.8} testID="hero-login-btn">
            <RNText style={styles.heroButtonTextUnauth}>{t('home.loginButton')}</RNText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
