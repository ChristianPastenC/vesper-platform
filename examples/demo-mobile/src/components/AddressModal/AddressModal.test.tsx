import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AddressModal } from './AddressModal';
import { useAppStore } from '../../store/useAppStore';

jest.mock('../../store/useAppStore', () => ({
  useAppStore: Object.assign(jest.fn(), {
    getState: jest.fn(),
    setState: jest.fn(),
  }),
}));

describe('AddressModal', () => {
  const mockOnClose = jest.fn();
  const mockSetDeliveryAddress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        deliveryAddress: 'Old Address',
        setDeliveryAddress: mockSetDeliveryAddress,
      };
      return selector(state);
    });
  });

  it('renders correctly with stored address', () => {
    const { getByTestId, getByDisplayValue } = render(
      <AddressModal visible={true} onClose={mockOnClose} />,
    );

    expect(getByTestId('address-modal')).toBeTruthy();
    expect(getByDisplayValue('Old Address')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(<AddressModal visible={true} onClose={mockOnClose} />);

    fireEvent.press(getByTestId('close-address-modal'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('updates state and calls setDeliveryAddress on save', () => {
    const { getByTestId } = render(<AddressModal visible={true} onClose={mockOnClose} />);

    const input = getByTestId('address-input');
    fireEvent.changeText(input, 'New Address');

    const saveButton = getByTestId('save-address-btn');
    fireEvent.press(saveButton);

    expect(mockSetDeliveryAddress).toHaveBeenCalledWith('New Address');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
