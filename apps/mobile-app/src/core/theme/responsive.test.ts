import { scale, verticalScale, moderateScale, scaleFont, Spacing, Layout } from './responsive';

jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
  },
  PixelRatio: {
    roundToNearestPixel: jest.fn((size) => Math.round(size)),
  },
}));

describe('responsive utilities', () => {
  it('scales width correctly', () => {
    expect(scale(100)).toBe(100);
  });

  it('scales height correctly', () => {
    expect(verticalScale(100)).toBe(100);
  });

  it('scales moderately correctly', () => {
    expect(moderateScale(100)).toBe(100);
    expect(moderateScale(100, 0.2)).toBe(100);
  });

  it('scales font correctly', () => {
    expect(scaleFont(16)).toBe(16);
  });

  it('exports correct Spacing and Layout', () => {
    expect(Spacing.sm).toBe(8);
    expect(Layout.window.width).toBe(375);
    expect(Layout.isSmallDevice).toBe(false);
  });
});
