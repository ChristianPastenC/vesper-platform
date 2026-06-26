import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthHero } from './AuthHero';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../core/theme/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: '#121212',
    },
  }),
}));

describe('AuthHero', () => {
  it('renders title and subtitle correctly', () => {
    const { getByText } = render(<AuthHero />);
    expect(getByText('auth.title')).toBeTruthy();
    expect(getByText('auth.subtitle')).toBeTruthy();
  });
});
