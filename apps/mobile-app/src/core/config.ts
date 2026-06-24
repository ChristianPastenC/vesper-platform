/**
 * Returns the base API URL.
 * In development (__DEV__): falls back to localhost:8080 if not set.
 * In production: throws an error if the variable is missing.
 */
export const getApiUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) return url;
  if (__DEV__) {
    console.warn('[Config] EXPO_PUBLIC_API_URL is not set. Falling back to http://localhost:8080');
    return 'http://localhost:8080';
  }
  throw new Error('[Config] EXPO_PUBLIC_API_URL is required in production.');
};
