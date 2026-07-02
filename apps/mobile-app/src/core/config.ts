import { Platform } from 'react-native';

/**
 * Returns the base API URL.
 * In development (__DEV__): falls back to 10.0.2.2 (Android) or localhost (iOS) if not set.
 * In production: throws an error if the variable is missing.
 */
export const getApiUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) return url;
  if (__DEV__) {
    const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
    console.warn(`[Config] EXPO_PUBLIC_API_URL is not set. Falling back to ${fallback}`);
    return fallback;
  }
  throw new Error('[Config] EXPO_PUBLIC_API_URL is required in production.');
};

export const getTestCardNumber = () => process.env.TEST_CARD_NUMBER ?? '4242424242424242';
