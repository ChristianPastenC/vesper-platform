/**
 * @sovereign/secure-client — public package surface
 *
 * All public symbols are available from this entry point.
 * For tree-shaking in bundle-size sensitive applications, use the dedicated
 * subpath imports:
 *
 *   import { DPoPSigner, withDPoP }                      from '@sovereign/secure-client/dpop';
 *   import { FetchAdapter, AxiosAdapter, GraphQLAdapter,
 *             fetchWithTrapping, axiosWithTrapping,
 *             graphqlWithTrapping }                       from '@sovereign/secure-client/adapters';
 *
 * Internal modules (crypto.ts, ledger.ts, core.ts, dpop/*, adapters/*) are
 * private implementation details and may change without notice.
 */

// ---------------------------------------------------------------------------
// Abstract interface contracts (zero-dependency layer)
// ---------------------------------------------------------------------------
export type {
  // Crypto provider contracts
  ISovereignCryptoProvider,
  IDPoPCryptoProvider,
  // Network adapter contracts
  SovereignAdapterRequest,
  SovereignAdapterResponse,
  ISovereignNetworkAdapter,
  ISovereignNetworkAdapterFactory,
} from './contracts/index.js';

// ---------------------------------------------------------------------------
// Core contracts & types
// ---------------------------------------------------------------------------
export type {
  SovereignRequestConfig,
  SovereignClientCoreConfig,
  ErrorTrappingConfig,
  LedgerBlock,
  NetworkStatusResolver,
  QueuedRequestRecord,
} from './types.js';

// Typed HTTP error — throw from your executor to feed the Error Trapping Matrix
export { SovereignHttpError, IntegrityBreachError } from './types.js';

// ---------------------------------------------------------------------------
// Binary encoding helpers — produce zeroizable Uint8Array buffers for use
// with SovereignAdapterRequest.body and SovereignAdapterRequest.encodedHeaders
// ---------------------------------------------------------------------------
export {
  encodeJsonBody,
  encodeTextBody,
  encodeHeaders,
  appendHeaderToBinary,
  decodeHeaders,
  decodeBody,
  serializeAdapterRequest,
  deserializeAdapterRequest,
} from './binary.js';

// ---------------------------------------------------------------------------
// Ledger & interceptor
// ---------------------------------------------------------------------------
export { SovereignMemoryQueue } from './ledger/index.js';
export { SovereignClientCore } from './core/index.js';

// ---------------------------------------------------------------------------
// DPoP — asymmetric proof-of-possession signing client
// ---------------------------------------------------------------------------
export type {
  DPoPAlgorithm,
  DPoPKeyPair,
  DPoPKeyConfig,
  DPoPProofOptions,
  DPoPProofHeader,
  DPoPTokenContext,
  DPoPContextResolver,
} from './dpop/index.js';

export { generateDPoPKeyPair } from './dpop/keys.js';
export { DPoPSigner } from './dpop/signer.js';

// SovereignClientCore ↔ DPoP integration bridge (lazy, fresh proof on every call)
export { withDPoP } from './dpop/executor.js';

// ---------------------------------------------------------------------------
// Transport adapters — functional utilities
// ---------------------------------------------------------------------------

// fetch — auto-throws SovereignHttpError for non-2xx responses
export type { FetchWithTrappingOptions, FetchAdapterOptions } from './adapters/fetch/index.js';
export { fetchWithTrapping, FetchAdapter } from './adapters/fetch/index.js';

// Axios — handles validateStatus overrides; no hard axios peer dependency
export type {
  AxiosInstance,
  AxiosCompatRequestConfig,
  AxiosCompatResponse,
  AxiosAdapterOptions,
} from './adapters/axios/index.js';
export { axiosWithTrapping, AxiosAdapter } from './adapters/axios/index.js';

// GraphQL — framework-agnostic POST client; no Apollo/urql peer dependency
export type {
  GraphQLRequest,
  GraphQLRequestOptions,
  GraphQLErrorShape,
  GraphQLAdapterOptions,
} from './adapters/graphql/index.js';
export {
  GraphQLRequestError,
  graphqlWithTrapping,
  GraphQLAdapter,
} from './adapters/graphql/index.js';
