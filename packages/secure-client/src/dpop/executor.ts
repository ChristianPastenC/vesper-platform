import type { DPoPContextResolver } from './types.js';
import type { DPoPSigner } from './signer.js';
import type { PendingDPoPContext } from '../types.js';

export const withDPoP = (
  signer: DPoPSigner,
  method: string,
  url: string,
  contextResolver: DPoPContextResolver,
): PendingDPoPContext => {
  return {
    signer,
    method,
    url,
    contextResolver,
  };
};
