import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

export const useAddressModal = (onClose: () => void) => {
  const { t } = useTranslation();
  const storedAddress = useAppStore((state) => state.deliveryAddress);
  const setDeliveryAddress = useAppStore((state) => state.setDeliveryAddress);

  const [address, setAddress] = useState(storedAddress);

  // Sync state if storedAddress changes outside the modal
  useEffect(() => {
    setAddress(storedAddress);
  }, [storedAddress]);

  const handleSave = () => {
    setDeliveryAddress(address.trim());
    onClose();
  };

  const handleCancel = () => {
    setAddress(storedAddress);
    onClose();
  };

  return {
    t,
    address,
    setAddress,
    handleSave,
    handleCancel,
  };
};
