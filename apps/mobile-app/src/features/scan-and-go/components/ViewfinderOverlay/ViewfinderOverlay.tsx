import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../../components/Text';
import { Button } from '../../../../components/Button';
import { stylesFactory } from './ViewfinderOverlay.styles';

export interface ViewfinderOverlayProps {
  hasPermission: boolean;
  requestPermission: () => void;
}

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = ({
  hasPermission,
  requestPermission,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);

  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasPermission) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 200,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [hasPermission, laserAnim]);

  if (!hasPermission) {
    return (
      <View
        style={[styles.viewfinderFrame, styles.permissionContainer]}
        testID="no-permission-view"
      >
        <Text style={styles.permissionText}>{t('scan_and_go.cameraPermission')}</Text>
        <Button title={t('scan_and_go.requestPermission')} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="viewfinder-overlay" pointerEvents="none">
      <View style={styles.darkOverlay} />
      <View style={styles.middleRow}>
        <View style={styles.darkOverlay} />
        <View style={styles.viewfinderFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Animated.View
            style={[styles.laserLine, { transform: [{ translateY: laserAnim }] }]}
            testID="laser-line"
          />
        </View>
        <View style={styles.darkOverlay} />
      </View>
      <View style={styles.darkOverlay} />
    </View>
  );
};
