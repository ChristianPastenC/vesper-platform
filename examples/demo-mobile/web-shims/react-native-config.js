const webOverrides =
  (typeof globalThis !== 'undefined' && globalThis.__SOVEREIGN_WEB_CONFIG__) || {};

export const Config = {
  API_URL: webOverrides.API_URL || 'https://demo-backend-4puz.onrender.com',
  TELEMETRY_ENDPOINT:
    webOverrides.TELEMETRY_ENDPOINT ||
    'https://vesper-ingestion.onrender.com/api/v1/support/telemetry',
  TELEMETRY_API_KEY: webOverrides.TELEMETRY_API_KEY || 'sk_test_demo123',
  TELEMETRY_BUNDLE_ID: webOverrides.TELEMETRY_BUNDLE_ID || 'com.demo.app',
  TEST_CARD_NUMBER: webOverrides.TEST_CARD_NUMBER || '4242424242424242',
};

export default Config;
