import type { GhostAdapterRequest } from '../contracts/index.js';
import type {
  PendingDPoPContext,
  GhostRequestConfig,
  GhostClientCoreConfig,
} from '../types.js';
import type { DPoPSigner } from '../dpop/signer.js';
import { decodeHeaders } from '../binary.js';

export const resolveDPoPContext = (
  request: GhostAdapterRequest,
  dpopSigner?: DPoPSigner,
  dpopConfig?: GhostClientCoreConfig['dpop'],
  dpop?: PendingDPoPContext,
  config?: GhostRequestConfig,
): PendingDPoPContext | undefined => {
  if (dpop) return dpop;

  let authHeaderValue: string | undefined;
  let requiresDPoP = config?.requireDPoP === true;

  if (request.encodedHeaders && request.encodedHeaders.length > 0) {
    const decoded = decodeHeaders(request.encodedHeaders);
    authHeaderValue = decoded['Authorization'] || decoded['authorization'];
    if (decoded['DPoP'] !== undefined || decoded['dpop'] !== undefined) {
      requiresDPoP = true;
    }
  } else if (request.headers) {
    authHeaderValue = request.headers['Authorization'] || request.headers['authorization'];
    if (request.headers['DPoP'] !== undefined || request.headers['dpop'] !== undefined) {
      requiresDPoP = true;
    }
  }

  let accessToken: string | undefined;
  if (authHeaderValue && authHeaderValue.toLowerCase().startsWith('dpop ')) {
    accessToken = authHeaderValue.slice(5).trim();
    requiresDPoP = true;
  }

  if (requiresDPoP && dpopSigner) {
    return {
      signer: dpopSigner,
      method: request.method,
      url: request.url,
      contextResolver: () => (accessToken !== undefined ? { accessToken } : {}),
    };
  }

  if (dpopSigner && dpopConfig) {
    return {
      signer: dpopSigner,
      method: request.method,
      url: request.url,
      contextResolver: dpopConfig.contextResolver,
    };
  }

  return undefined;
};

export const zeroRequestBuffers = (
  request: Pick<GhostAdapterRequest, 'body' | 'encodedHeaders'>,
): void => {
  if (request.body && request.body.length > 0) {
    request.body.fill(0);
  }
  if (request.encodedHeaders && request.encodedHeaders.length > 0) {
    request.encodedHeaders.fill(0);
  }
};
