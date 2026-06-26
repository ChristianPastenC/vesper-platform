import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SyncAlert } from './SyncAlert';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

describe('SyncAlert Component', () => {
  const mockToggleNetwork = jest.fn();
  const mockT = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isFrozen is false', () => {
    const { queryByTestId } = render(
      <SyncAlert isFrozen={false} toggleNetwork={mockToggleNetwork} t={mockT} />
    );
    expect(queryByTestId('home-network-toggle')).toBeNull();
  });

  it('renders alert when isFrozen is true and handles press', () => {
    const { getByTestId, getByText } = render(
      <SyncAlert isFrozen={true} toggleNetwork={mockToggleNetwork} t={mockT} />
    );

    expect(getByText('home.pendingSync')).toBeTruthy();
    
    fireEvent.press(getByTestId('home-network-toggle'));
    expect(mockToggleNetwork).toHaveBeenCalledTimes(1);
  });
});
