import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { useAuthHero } from './useAuthHero';
import { stylesFactory } from './AuthHero.styles';

export const AuthHero: React.FC = () => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { title, subtitle } = useAuthHero();

  return (
    <View testID="auth-hero">
      <Text variant="title" style={styles.title}>
        {title}
      </Text>
      <Text variant="caption" style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
};
