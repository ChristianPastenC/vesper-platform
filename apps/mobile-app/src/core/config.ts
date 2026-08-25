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

/**
 * Telemetry ingestion is opt-in: only enabled once a developer generates an
 * API Key in the web-support-portal and drops it into EXPO_PUBLIC_TELEMETRY_API_KEY.
 */
export const getTelemetryApiKey = (): string | undefined =>
  process.env.EXPO_PUBLIC_TELEMETRY_API_KEY || undefined;

// Must match app.json's ios.bundleIdentifier / android.package — the telemetry-api
// binds an API Key to this value on first use (TOFU) and rejects any mismatch.
export const getTelemetryBundleId = (): string =>
  process.env.EXPO_PUBLIC_TELEMETRY_BUNDLE_ID ?? 'mx.edu.sovereign.core';

export const getTelemetryEndpoint = (): string => {
  const url = process.env.EXPO_PUBLIC_TELEMETRY_ENDPOINT;
  if (url) return url;
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:8081/api/v1/support/telemetry`;
};
