import React from 'react';
import { View, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './NetworkDiagnosticsCard.styles';

export interface NetworkDiagnosticsCardProps {
  isOnline: boolean;
  onToggleNetwork: (value: boolean) => void;
}

export const NetworkDiagnosticsCard: React.FC<NetworkDiagnosticsCardProps> = ({
  isOnline,
  onToggleNetwork,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = stylesFactory(theme.colors, insets);

  return (
    <View style={styles.networkToggleCard} testID="network-diagnostics-card">
      <Ionicons
        name={isOnline ? 'wifi' : 'wifi-outline'}
        size={24}
        color={isOnline ? theme.colors.success : theme.colors.error}
        style={styles.networkIcon}
        testID="network-icon"
      />
      <View style={styles.networkInfo}>
        <Text variant="bold">{t('scan_and_go.networkStatus')}</Text>
        <Text style={styles.networkStatusLabel}>
          {isOnline ? t('scan_and_go.onlineLabel') : t('scan_and_go.offlineLabel')}
        </Text>
      </View>
      <Switch
        value={isOnline}
        onValueChange={onToggleNetwork}
        trackColor={{ false: '#767577', true: theme.colors.primary + '80' }}
        thumbColor={isOnline ? theme.colors.primary : '#f4f3f4'}
        testID="network-switch"
      />
    </View>
  );
};
