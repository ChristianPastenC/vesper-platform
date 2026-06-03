/**
 * @sovereign/secure-client — public package surface
 *
 * Consumers should import exclusively from this entry point.
 * Internal modules (crypto, ledger, core) are considered private
 * implementation details and may change without notice.
 */

// Contracts & types
export type {
  ISovereignCryptoProvider,
  SovereignRequestConfig,
  SovereignClientCoreConfig,
  ErrorTrappingConfig,
  LedgerBlock,
  NetworkStatusResolver,
} from './types.js';

// Typed HTTP error — throw from your executor to feed the Error Trapping Matrix
export { SovereignHttpError } from './types.js';

// In-memory cryptographic ledger
export { SovereignMemoryQueue } from './ledger.js';

// Request interceptor and queue orchestrator
export { SovereignClientCore } from './core.js';