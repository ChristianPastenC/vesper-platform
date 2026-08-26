import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../core/theme/useTheme';
import { Text } from '../../../components/Text';
import { InStoreCartItem } from '../../../store/useAppStore';
import { stylesFactory } from './InStoreRow.styles';

export interface InStoreRowProps {
  item: InStoreCartItem;
}

export const InStoreRow: React.FC<InStoreRowProps> = ({ item }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text variant="bold" style={styles.name}>
          {item.name}
        </Text>
        <Text variant="caption" style={styles.barcode}>
          UPC: {item.barcode}
        </Text>
        <Text variant="caption" style={styles.details}>
          ${item.price.toFixed(2)} x {item.quantity}
        </Text>
      </View>
      <Text variant="bold" style={styles.total}>
        ${(item.price * item.quantity).toFixed(2)}
      </Text>
    </View>
  );
};
