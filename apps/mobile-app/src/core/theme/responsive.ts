import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Baseline design dimensions (iPhone 11/13/15 base size: 375x812)
const BASELINE_WIDTH = 375;
const BASELINE_HEIGHT = 812;

const scaleWidth = SCREEN_WIDTH / BASELINE_WIDTH;
const scaleHeight = SCREEN_HEIGHT / BASELINE_HEIGHT;

/**
 * Scale dimension based on screen width
 */
export const scale = (size: number): number => {
  const newSize = size * scaleWidth;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Scale dimension based on screen height
 */
export const verticalScale = (size: number): number => {
  const newSize = size * scaleHeight;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Scale dimension moderately
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Scale font size based on screen width with custom adjustment
 */
export const scaleFont = (size: number): number => {
  const newSize = size * scaleWidth;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const Spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(40),
};

export const Layout = {
  window: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  isSmallDevice: SCREEN_WIDTH < 375,
};
