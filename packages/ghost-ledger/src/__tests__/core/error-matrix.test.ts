import {
  extractHttpStatus,
  isTransportError,
  isFreezableHttpStatus,
  shouldFreezeSession,
} from '../../core/error-matrix.js';
import { SovereignHttpError } from '../../types.js';

describe('Error Matrix', () => {
  const mockTrapping = {
    freezeOn503_504: true,
    freezeOn401: true,
    additionalFreezableStatuses: new Set<number>([429])
  };

  it('should extract http status', () => {
    expect(extractHttpStatus(null)).toBeNull();
    expect(extractHttpStatus(new SovereignHttpError(400, 'err'))).toBe(400);
    expect(extractHttpStatus({ isAxiosError: true, response: { status: 404 } })).toBe(404);
    expect(extractHttpStatus({ status: 500 })).toBe(500);
    expect(extractHttpStatus({ networkError: { statusCode: 502 } })).toBe(502);
  });

  it('should detect transport error', () => {
    expect(isTransportError(null)).toBe(false);
    expect(isTransportError({ isAxiosError: true })).toBe(true);
    expect(isTransportError(new TypeError('Network request failed'))).toBe(true);
    expect(isTransportError({ networkError: true })).toBe(true);
  });

  it('should detect freezable http status', () => {
    expect(isFreezableHttpStatus({ status: 200 }, mockTrapping)).toBe(false);
    expect(isFreezableHttpStatus({ status: 503 }, mockTrapping)).toBe(true);
    expect(isFreezableHttpStatus({ status: 504 }, mockTrapping)).toBe(true);
    expect(isFreezableHttpStatus({ status: 401 }, mockTrapping)).toBe(true);
    expect(isFreezableHttpStatus({ status: 429 }, mockTrapping)).toBe(true);
    expect(isFreezableHttpStatus({ status: 404 }, mockTrapping)).toBe(false);
  });

  it('should freeze session correctly', () => {
    expect(shouldFreezeSession({ isAxiosError: true }, mockTrapping)).toBe(true);
    expect(shouldFreezeSession({ status: 503 }, mockTrapping)).toBe(true);
    expect(shouldFreezeSession({ status: 200 }, mockTrapping)).toBe(false);
  });
});
