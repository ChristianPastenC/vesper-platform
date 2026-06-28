import React from 'react';
import { Animated, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './ScanToast.styles';
import { useScanToast } from './useScanToast';

export interface ScanToastProps {
  lastScanned: string | null;
}

export const ScanToast: React.FC<ScanToastProps> = ({ lastScanned }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { visibleItem, animValue } = useScanToast(lastScanned);

  if (!visibleItem) return null;

  return (
    <Animated.View
      testID="scan-toast"
      style={[
        styles.toast,
        {
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.toastText}>
        {t('catalog.itemAdded')}: {visibleItem}
      </Text>
    </Animated.View>
  );
};
