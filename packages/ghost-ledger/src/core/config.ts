import type { ErrorTrappingConfig } from '../types.js';

// HTTP status code constants
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_SERVICE_UNAVAILABLE = 503;
export const HTTP_GATEWAY_TIMEOUT = 504;

/**
 * Normalised, fully-resolved version of ErrorTrappingConfig.
 * All optional fields are collapsed to their defaults so the matrix evaluation
 * code never needs to perform undefined checks at call time.
 */
export interface ResolvedTrappingConfig {
  freezeOn503_504: boolean;
  freezeOn401: boolean;
  additionalFreezableStatuses: ReadonlySet<number>;
}

/**
 * Normalises the consumer-supplied ErrorTrappingConfig by applying defaults
 * for every optional field, producing a ResolvedTrappingConfig where all
 * values are fully defined and ready for use inside hot evaluation paths.
 */
export const resolveTrappingConfig = (
  raw: ErrorTrappingConfig | undefined,
): ResolvedTrappingConfig => {
  return {
    freezeOn503_504: raw?.freezeOn503_504 ?? true,
    freezeOn401: raw?.freezeOn401 ?? false,
    additionalFreezableStatuses: new Set(raw?.additionalFreezableStatuses ?? []),
  };
};
