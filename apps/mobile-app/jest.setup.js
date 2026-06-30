import 'react-native';

// Mock react-native-quick-crypto to use Node.js crypto for testing
jest.mock('react-native-quick-crypto', () => {
  const crypto = require('crypto');
  return {
    randomBytes: jest.fn((size) => crypto.randomBytes(size)),
    randomUUID: jest.fn(() => crypto.randomUUID()),
    webcrypto: {
      subtle: {
        digest: jest.fn(async (algo, data) => {
          const hash = crypto.createHash('sha256');
          // For tests, data is an ArrayBuffer, convert it to Buffer
          hash.update(Buffer.from(data));
          return hash.digest().buffer;
        }),
      },
      getRandomValues: jest.fn((array) => {
        const randomBytes = crypto.randomBytes(array.byteLength);
        array.set(randomBytes);
        return array;
      }),
      randomUUID: jest.fn(() => crypto.randomUUID()),
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
