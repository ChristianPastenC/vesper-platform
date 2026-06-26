import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './DeliveryAddressCard.styles';

export interface DeliveryAddressCardProps {
  label: string;
  address: string;
}

export const DeliveryAddressCard: React.FC<DeliveryAddressCardProps> = ({ label, address }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.card} testID="delivery-address-card">
      <Text variant="bold" style={styles.label}>
        {label}
      </Text>
      <Text style={styles.value}>{address}</Text>
    </View>
  );
};
