import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { useStoreCard } from './useStoreCard';
import { stylesFactory } from './StoreCard.styles';

export interface StoreCardProps {
  id: string;
  name: string;
  distance: string;
  hours: string;
  address: string;
  onPressRoute?: () => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  name,
  distance,
  hours,
  address,
  onPressRoute,
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { t } = useStoreCard();

  return (
    <View style={styles.cardContainer} testID="store-card">
      <View style={styles.headerRow}>
        <Text style={styles.storeName}>{name}</Text>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{distance}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={16} color={theme.colors.text + '99'} />
        <Text style={styles.infoText}>{address}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={theme.colors.text + '99'} />
        <Text style={styles.infoText}>{hours}</Text>
      </View>

      <TouchableOpacity style={styles.actionButton} onPress={onPressRoute} testID="store-route-btn">
        <Text style={styles.actionText}>{t('stores.getDirections', 'Get Directions')}</Text>
      </TouchableOpacity>
    </View>
  );
};
