import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../core/theme/useTheme';
import { Text } from '../Text';
import { Button } from '../Button';
import { useAddressModal } from './useAddressModal';
import { stylesFactory } from './AddressModal.styles';

export interface AddressModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const styles = stylesFactory(theme.colors);
  const { t, address, setAddress, handleSave, handleCancel } = useAddressModal(onClose);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
      testID="address-modal"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text variant="bold" style={styles.title}>
                  {t('location.title', 'Delivery Address')}
                </Text>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.closeButton}
                  testID="close-address-modal"
                >
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('location.addressLabel', 'Your Address')}</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder={t('location.addressPlaceholder', 'Enter your full address')}
                  placeholderTextColor={theme.colors.text + '50'}
                  multiline
                  autoFocus
                  testID="address-input"
                />
              </View>

              <View style={styles.footer}>
                <Button
                  title={t('location.saveButton', 'Save Address')}
                  onPress={handleSave}
                  testID="save-address-btn"
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
