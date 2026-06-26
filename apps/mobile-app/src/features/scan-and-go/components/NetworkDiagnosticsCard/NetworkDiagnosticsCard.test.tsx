import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NetworkDiagnosticsCard } from './NetworkDiagnosticsCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#10B981',
      success: '#10B981',
      error: '#EF4444',
      text: '#000000',
      surface: '#FFFFFF',
      border: '#E2E8F0',
    },
  }),
}));

describe('NetworkDiagnosticsCard', () => {
  it('renders correctly when online', () => {
    const { getByTestId, getByText } = render(
      <NetworkDiagnosticsCard isOnline={true} onToggleNetwork={jest.fn()} />
    );

    expect(getByTestId('network-diagnostics-card')).toBeTruthy();
    expect(getByText('scan_and_go.networkStatus')).toBeTruthy();
    expect(getByText('scan_and_go.onlineLabel')).toBeTruthy();
    
    const switchElement = getByTestId('network-switch');
    expect(switchElement.props.value).toBe(true);
  });

  it('renders correctly when offline', () => {
    const { getByText, getByTestId } = render(
      <NetworkDiagnosticsCard isOnline={false} onToggleNetwork={jest.fn()} />
    );

    expect(getByText('scan_and_go.offlineLabel')).toBeTruthy();
    const switchElement = getByTestId('network-switch');
    expect(switchElement.props.value).toBe(false);
  });

  it('calls onToggleNetwork when switch is pressed', () => {
    const toggleMock = jest.fn();
    const { getByTestId } = render(
      <NetworkDiagnosticsCard isOnline={true} onToggleNetwork={toggleMock} />
    );

    const switchElement = getByTestId('network-switch');
    fireEvent(switchElement, 'onValueChange', false);

    expect(toggleMock).toHaveBeenCalledWith(false);
  });
});
