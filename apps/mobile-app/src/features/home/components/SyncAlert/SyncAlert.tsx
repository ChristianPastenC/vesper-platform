import React from 'react';
import { TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { stylesFactory } from './SyncAlert.styles';
import { Text } from '../../../../components/Text';

interface SyncAlertProps {
  isFrozen: boolean;
  toggleNetwork: () => void;
  t: (key: string) => string;
}

export const SyncAlert: React.FC<SyncAlertProps> = ({ isFrozen, toggleNetwork, t }) => {
  const styles = stylesFactory();

  if (!isFrozen) return null;

  return (
    <TouchableOpacity
      style={styles.alertContainer}
      onPress={toggleNetwork}
      activeOpacity={0.8}
      testID="home-network-toggle"
    >
      <Text style={styles.alertText}>{t('home.pendingSync')}</Text>
      <Ionicons name="sync-circle-outline" size={24} color="#D97706" />
    </TouchableOpacity>
  );
};
