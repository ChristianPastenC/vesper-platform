import React from 'react';
import { render } from '@testing-library/react-native';
import { ErrorBanner } from './ErrorBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      error: '#EF4444',
    },
  }),
}));

describe('ErrorBanner', () => {
  it('does not render if error is null', () => {
    const { queryByTestId } = render(<ErrorBanner error={null} />);
    expect(queryByTestId('error-banner')).toBeNull();
  });

  it('renders correctly when error is present', () => {
    const { getByTestId, getByText } = render(<ErrorBanner error="Error message" />);

    expect(getByTestId('error-banner')).toBeTruthy();
    expect(getByText('scan_and_go.error503')).toBeTruthy();
  });
});
