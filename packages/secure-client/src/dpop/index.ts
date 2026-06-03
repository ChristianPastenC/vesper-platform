/**
 * @sovereign/secure-client/dpop — public DPoP subpath surface
 *
 * Import from this path when you need only the DPoP signing client
 * without pulling in the ledger or core interceptor:
 *
 *   import { DPoPSigner, withDPoP } from '@sovereign/secure-client/dpop';
 *   import type { IDPoPCryptoProvider, DPoPProofOptions } from '@sovereign/secure-client/dpop';
 */

// Types
export type {
  DPoPAlgorithm,
  DPoPKeyPair,
  DPoPKeyConfig,
  DPoPProofOptions,
  DPoPProofHeader,
  IDPoPCryptoProvider,
} from './types.js';

// Executor integration types
export type {
  DPoPTokenContext,
  DPoPContextResolver,
} from './executor.js';

// Key generation (exported for consumers who manage key pairs directly)
export { generateDPoPKeyPair } from './keys.js';

// Primary signing client
export { DPoPSigner } from './signer.js';

// SovereignClientCore ↔ DPoP integration bridge
export { withDPoP } from './executor.js';
