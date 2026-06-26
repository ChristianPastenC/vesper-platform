import React from 'react';
import { View, FlatList, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../../../core/theme/useTheme';
import { Text } from '../../../../components/Text';
import { OnlineRow } from '../OnlineRow';
import { OnlineCartItem } from '../../../../store/useAppStore';
import { stylesFactory } from './OnlineCartList.styles';

export interface OnlineCartListProps {
  cartItems: OnlineCartItem[];
  emptyMessage: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const OnlineCartList: React.FC<OnlineCartListProps> = ({
  cartItems,
  emptyMessage,
  contentContainerStyle,
}) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer} testID="empty-state">
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cartItems}
      renderItem={({ item }) => <OnlineRow item={item} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      testID="cart-list"
    />
  );
};
