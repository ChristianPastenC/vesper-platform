import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './HeroBanner.styles';
import { Text } from '../../../../components/Text';

interface HeroBannerProps {
  isAuthenticated: boolean;
  navigateToAccount: () => void;
  navigateToCatalog: () => void;
  t: (key: string) => string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  isAuthenticated,
  navigateToAccount,
  navigateToCatalog,
  t,
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.heroContainer}>
      {isAuthenticated ? (
        <View style={styles.heroCardAuth} testID="hero-auth-card">
          <Text style={styles.heroTitleAuth}>{t('home.promoTitle')}</Text>
          <Text style={styles.heroSubtitleAuth}>{t('home.promoSubtitle')}</Text>
          <TouchableOpacity
            style={styles.heroButton}
            activeOpacity={0.8}
            testID="hero-vault-btn"
            onPress={navigateToCatalog}
          >
            <Text style={styles.heroButtonText}>{t('home.shopNow')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.heroCardUnauth} testID="hero-unauth-card">
          <Text style={styles.heroTitleUnauth}>{t('home.welcomeTitleGuest')}</Text>
          <Text style={styles.heroSubtitleUnauth}>{t('home.loginPrompt')}</Text>
          <TouchableOpacity
            style={styles.heroButtonUnauth}
            onPress={navigateToAccount}
            activeOpacity={0.8}
            testID="hero-login-btn"
          >
            <Text style={styles.heroButtonTextUnauth}>{t('home.loginButton')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
