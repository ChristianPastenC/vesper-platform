import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../core/theme/useTheme';
import { Text } from '../../../components/Text';
import { OnlineCartItem } from '../../../store/useAppStore';
import { stylesFactory } from './OnlineRow.styles';

export interface OnlineRowProps {
  item: OnlineCartItem;
}

export const OnlineRow: React.FC<OnlineRowProps> = ({ item }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text variant="bold" style={styles.name}>
          {item.name}
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
