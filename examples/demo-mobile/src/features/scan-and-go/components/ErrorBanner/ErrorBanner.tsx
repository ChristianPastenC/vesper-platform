import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './ErrorBanner.styles';

export interface ErrorBannerProps {
  error: string | null;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  if (!error) return null;

  return (
    <View style={styles.errorBanner} testID="error-banner">
      <Ionicons
        name="alert-circle-outline"
        size={20}
        color={theme.colors.error}
        style={styles.errorIcon}
      />
      <Text style={styles.errorText}>{t('scan_and_go.error503')}</Text>
    </View>
  );
};
