const webCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

export const subtle = webCrypto ? webCrypto.subtle : undefined;

export const randomBytes = (size) => {
  const bytes = new Uint8Array(size);
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  }
  return bytes;
};

export const randomUUID = () => {
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const webcrypto = webCrypto;

export default {
  subtle,
  randomBytes,
  randomUUID,
  webcrypto,
};
