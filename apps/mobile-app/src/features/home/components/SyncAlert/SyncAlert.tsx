import React from 'react';
import { TouchableOpacity, Text as RNText } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { stylesFactory } from './SyncAlert.styles';

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
      <RNText style={styles.alertText}>{t('home.pendingSync')}</RNText>
      <Ionicons name="sync-circle-outline" size={24} color="#D97706" />
    </TouchableOpacity>
  );
};
