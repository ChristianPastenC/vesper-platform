import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ViewfinderOverlay } from './ViewfinderOverlay';

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
    },
  }),
}));

describe('ViewfinderOverlay', () => {
  it('renders permission request view when hasPermission is false', () => {
    const requestPermissionMock = jest.fn();
    const { getByTestId, getByText } = render(
      <ViewfinderOverlay hasPermission={false} requestPermission={requestPermissionMock} />
    );

    expect(getByTestId('no-permission-view')).toBeTruthy();
    expect(getByText('scan_and_go.cameraPermission')).toBeTruthy();

    const button = getByText('scan_and_go.requestPermission');
    fireEvent.press(button);
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
  });

  it('renders viewfinder and laser line when hasPermission is true', () => {
    const { getByTestId } = render(
      <ViewfinderOverlay hasPermission={true} requestPermission={jest.fn()} />
    );

    expect(getByTestId('viewfinder-overlay')).toBeTruthy();
    expect(getByTestId('laser-line')).toBeTruthy();
  });
});
