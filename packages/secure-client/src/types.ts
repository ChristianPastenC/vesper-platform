export type { ISovereignCryptoProvider } from './contracts/index.js';
import type { ISovereignCryptoProvider } from './contracts/index.js';
import type { ISovereignNetworkAdapter } from './contracts/index.js';
import type { DPoPSigner } from './dpop/signer.js';
import type { DPoPContextResolver } from './dpop/index.js';
import type { DPoPAlgorithm } from './dpop/types.js';
export type { DPoPAlgorithm };

/** Request configuration with volatile TTL parameters. */
export interface SovereignRequestConfig {
  ttl?: number;
  requireDPoP?: boolean;
}

/** Error trapping HTTP response class. */
export class SovereignHttpError extends Error {
  public readonly status: number;
  constructor(status: number, message = `HTTP ${status}`) {
    super(message);
    this.name = 'SovereignHttpError';
    this.status = status;
    Object.setPrototypeOf(this, SovereignHttpError.prototype);
  }
}

/** Fired when memory tampering is detected by the watchdog. */
export class IntegrityBreachError extends Error {
  constructor(message = '[SovereignCore] Ledger integrity compromised. Queue is frozen.') {
    super(message);
    this.name = 'IntegrityBreachError';
    Object.setPrototypeOf(this, IntegrityBreachError.prototype);
  }
}

/** Fine-grained matrix of HTTP statuses that trigger freeze sequestration. */
export interface ErrorTrappingConfig {
  freezeOn503_504?: boolean;
  freezeOn401?: boolean;
  additionalFreezableStatuses?: number[];
}

/** Main constructor configuration parameter for the client. */
export interface SovereignClientCoreConfig {
  cryptoProvider: ISovereignCryptoProvider;
  networkResolver: NetworkStatusResolver;
  defaultTTL?: number;
  errorTrapping?: ErrorTrappingConfig;
  networkAdapter?: ISovereignNetworkAdapter;
  observers?: SessionLifecycleObservers;
  dpop?: {
    algorithm?: DPoPAlgorithm;
    contextResolver: DPoPContextResolver;
  };
  enableAutoDPoP?: boolean;
  dpopAlgorithm?: DPoPAlgorithm;
}

/** Observers that monitor state transitions of the volatile session. */
export interface SessionLifecycleObservers {
  onSessionFreeze?: (reason: unknown) => void;
  onSessionResume?: () => void;
  onSessionPurge?: (reason: Error) => void;
  onIntegrityBreach?: () => void;
}

/** Cryptographic block structure for tracking transaction sequences. */
export interface LedgerBlock {
  id: string;
  serializedRequest: Uint8Array;
  timestamp: number;
  ttl: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expiryTimer: any;
  previousHash: Uint8Array;
  currentHash: Uint8Array;
  isZeroized: boolean;
}

export type NetworkStatusResolver = () => Promise<boolean>;

/** Internal request callback storage record (no request body/header strings). */
export interface QueuedRequestRecord<T = unknown> {
  resolve: (value: T) => void;
  reject:  (reason: unknown) => void;
  dpop?: PendingDPoPContext;
}

/** Metadata needed to lazily generate DPoP proofs during queue replay. */
export interface PendingDPoPContext {
  signer: DPoPSigner;
  contextResolver: DPoPContextResolver;
  method: string;
  url: string;
}
