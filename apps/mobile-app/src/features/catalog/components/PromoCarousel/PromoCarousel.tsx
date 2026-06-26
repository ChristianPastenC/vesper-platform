import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { stylesFactory } from './PromoCarousel.styles';

export const PromoCarousel: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.heroBanner} testID="promo-carousel-container">
      <View style={styles.heroMicroCapsule}>
        <Text style={styles.heroMicroText}>{t('catalog.heroTag')}</Text>
      </View>
      <Text style={styles.heroTitle}>{t('catalog.heroTitle')}</Text>
      <Text style={styles.heroSubText}>{t('catalog.heroSubText')}</Text>
    </View>
  );
};
