import { SovereignHttpError } from '../types.js';
import {
  HTTP_GATEWAY_TIMEOUT,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_UNAUTHORIZED,
  type ResolvedTrappingConfig,
} from './config.js';

/**
 * Extracts a numeric HTTP status code from an error object.
 */
export const extractHttpStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const e = error as Record<string, unknown>;

  if (error instanceof SovereignHttpError) return error.status;

  if (e['isAxiosError'] === true) {
    const response = e['response'] as Record<string, unknown> | undefined;
    if (response && typeof response['status'] === 'number') {
      return response['status'];
    }
  }

  if (typeof e['status'] === 'number') return e['status'];

  const networkErr = e['networkError'] as Record<string, unknown> | undefined;
  if (networkErr && typeof networkErr['statusCode'] === 'number') {
    return networkErr['statusCode'];
  }

  return null;
};

/**
 * Stage 1 — Transport-layer error detection.
 */
export const isTransportError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;

  if (e['isAxiosError'] === true && !e['response']) return true;
  if (error instanceof TypeError && error.message === 'Network request failed') return true;
  if (e['networkError']) return true;

  return false;
};

/**
 * Stage 2 — HTTP status code matrix evaluation.
 */
export const isFreezableHttpStatus = (
  error: unknown,
  trapping: ResolvedTrappingConfig,
): boolean => {
  const status = extractHttpStatus(error);
  if (status === null) return false;

  if (
    (status === HTTP_SERVICE_UNAVAILABLE || status === HTTP_GATEWAY_TIMEOUT) &&
    trapping.freezeOn503_504
  ) {
    return true;
  }

  if (status === HTTP_UNAUTHORIZED && trapping.freezeOn401) {
    return true;
  }

  if (trapping.additionalFreezableStatuses.has(status)) {
    return true;
  }

  return false;
};

/**
 * Central decision function: should this error cause the session to freeze?
 */
export const shouldFreezeSession = (error: unknown, trapping: ResolvedTrappingConfig): boolean => {
  return isTransportError(error) || isFreezableHttpStatus(error, trapping);
};
