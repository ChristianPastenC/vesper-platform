import React from 'react';
import { render } from '@testing-library/react-native';
import { StoreLocatorMap } from './StoreLocatorMap';
import { useStores } from '../../hooks/useStores';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText || key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#6200EE',
      surface: '#F5F5F5',
      border: '#E0E0E0',
    },
  }),
}));

jest.mock('../../hooks/useStores', () => ({
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

describe('StoreLocatorMap', () => {
  it('renders webview map correctly', () => {
    (useStores as jest.Mock).mockReturnValue({
      stores: [
        {
          id: '1',
          name: 'Store 1',
          address: 'Address 1',
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

    const { getByTestId } = render(<StoreLocatorMap />);
    expect(getByTestId('map-webview')).toBeTruthy();
  });
});
