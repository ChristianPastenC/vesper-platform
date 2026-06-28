import React from 'react';
import { render } from '@testing-library/react-native';
import { StoresScreen } from './StoresScreen';
import { useStores } from '../hooks/useStores';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

jest.mock('../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#121212',
      surface: '#F5F5F5',
      primary: '#6200EE',
      background: '#FFFFFF',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 20,
    bottom: 20,
  }),
}));

jest.mock('../hooks/useStores', () => ({
  useStores: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  const MockWebView = (props: any) => <View {...props} testID={props.testID || 'map-webview'} />;
  return {
    WebView: MockWebView,
  };
});
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */

describe('StoresScreen', () => {
  it('renders correctly with webview stores', () => {
    (useStores as jest.Mock).mockReturnValue({
      stores: [
        {
          id: '1',
          name: 'Sovereign Downtown',
          distance: '1.2 km',
          hours: '09:00 - 21:00',
          address: '123 Main St',
          coordinate: { latitude: 0, longitude: 0 },
        },
      ],
      getRegion: () => ({
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }),
    });

    const { getByText, getByTestId } = render(<StoresScreen />);

    expect(getByText('Our Stores')).toBeTruthy();
    expect(getByText('Nearby Locations')).toBeTruthy();
    expect(getByTestId('store-locator-map')).toBeTruthy();
    expect(getByText('Sovereign Downtown')).toBeTruthy();
  });
});
