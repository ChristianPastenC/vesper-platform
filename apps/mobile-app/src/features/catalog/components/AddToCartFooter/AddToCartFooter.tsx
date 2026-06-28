import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../../../components/Button';
import { stylesFactory } from './AddToCartFooter.styles';

interface AddToCartFooterProps {
  onAddToOnline: () => void;
  // onAddToInStore prop is kept for API compatibility but not rendered as per modern e-commerce UI
  onAddToInStore?: () => void;
}

export const AddToCartFooter: React.FC<AddToCartFooterProps> = ({ onAddToOnline }) => {
  const { t } = useTranslation();
  const styles = stylesFactory();

  return (
    <View style={styles.footerContainer} testID="add-to-cart-footer">
      <Button
        title={t('catalog.addToCart') || 'Add to Cart'}
        leftIcon={<Ionicons name="cart-outline" size={20} color="#FFFFFF" />}
        onPress={onAddToOnline}
        style={styles.actionBtn}
        testID="details-add-online-btn"
      />
    </View>
  );
};
