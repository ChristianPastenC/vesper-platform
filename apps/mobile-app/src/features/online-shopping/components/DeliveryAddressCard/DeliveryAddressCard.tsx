import React from 'react';
import { View, TextInput } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { stylesFactory } from './DeliveryAddressCard.styles';

export interface DeliveryAddressCardProps {
  label: string;
  address: string;
  onChangeAddress?: (text: string) => void;
  editable?: boolean;
}

export const DeliveryAddressCard: React.FC<DeliveryAddressCardProps> = ({ 
  label, 
  address, 
  onChangeAddress,
  editable = true,
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.card} testID="delivery-address-card">
      <Text variant="bold" style={styles.label}>
        {label}
      </Text>
      {editable && onChangeAddress ? (
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={onChangeAddress}
          placeholder="Enter your delivery address"
          placeholderTextColor={theme.colors.text + '50'}
        />
      ) : (
        <Text style={styles.value}>
          {address || 'No address provided'}
        </Text>
      )}
    </View>
  );
};
