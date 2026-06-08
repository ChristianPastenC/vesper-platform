import {
  IntegrityBreachError,
  type NetworkStatusResolver,
  type SovereignClientCoreConfig,
  type SovereignRequestConfig,
  type QueuedRequestRecord,
  type PendingDPoPContext,
  type SessionLifecycleObservers,
  type DPoPAlgorithm,
} from '../types.js';
import type {
  ISovereignCryptoProvider,
  ISovereignNetworkAdapter,
  SovereignAdapterRequest,
} from '../contracts/index.js';
import { SovereignMemoryQueue, configureQueueEngine } from '../ledger/index.js';
import { resolveTrappingConfig, type ResolvedTrappingConfig } from './config.js';
import { shouldFreezeSession } from './error-matrix.js';
import {
  serializeAdapterRequest,
  deserializeAdapterRequest,
  appendHeaderToBinary,
  decodeHeaders,
} from '../binary.js';
import { DPoPSigner } from '../dpop/signer.js';
import type { IDPoPCryptoProvider } from '../contracts/index.js';
import { resolveDPoPContext, zeroRequestBuffers } from './utils.js';

/**
 * SovereignClientCore
 * Coordinates the offline-sequestration execution path, managing request replay,
 * volatile RAM queuing, and dynamic DPoP token generation.
 */
export class SovereignClientCore {
  private static instance: SovereignClientCore;
  private readonly memoryQueue: SovereignMemoryQueue;
  private readonly cryptoProvider: ISovereignCryptoProvider;
  private readonly isOnline: NetworkStatusResolver;
  private readonly defaultTTL: number;
  private readonly trapping: ResolvedTrappingConfig;
  private readonly networkAdapter: ISovereignNetworkAdapter | undefined;
  private isProcessingQueue = false;
  private readonly pendingRequests = new Map<string, QueuedRequestRecord<unknown>>();
  private readonly observers: SessionLifecycleObservers | undefined;
  private _isFrozen = false;
  private readonly dpopConfig?: SovereignClientCoreConfig['dpop'];
  private readonly enableAutoDPoP: boolean;
  private readonly dpopAlgorithm: DPoPAlgorithm | undefined;
  private dpopSigner?: DPoPSigner;
  private dpopBootstrapPromise?: Promise<JsonWebKey | null>;

  private constructor(config: SovereignClientCoreConfig) {
    configureQueueEngine({ mock: config.mock });
    this.cryptoProvider = config.cryptoProvider;
    this.isOnline = config.networkResolver;
    this.defaultTTL = config.defaultTTL ?? 60_000;
    this.memoryQueue = SovereignMemoryQueue.getInstance();
    this.trapping = resolveTrappingConfig(config.errorTrapping);
    this.networkAdapter = config.networkAdapter;
    this.observers = config.observers;
    this.dpopConfig = config.dpop;
    this.enableAutoDPoP = config.enableAutoDPoP ?? false;
    this.dpopAlgorithm = config.dpopAlgorithm;

    // Start background active RAM watchdog to detect bit-flipping/tampering
    this.memoryQueue.startWatchdog(this.cryptoProvider, () => {
      console.error('[SovereignCore] CRITICAL: Memory tampering detected.');
      this.memoryQueue.suspendAndFreezeLedger();
      this.observers?.onIntegrityBreach?.();
    });

    if (this.dpopConfig || this.enableAutoDPoP) {
      this.dpopBootstrapPromise = this.bootstrapAutoDPoP().catch((err) => {
        console.error('[SovereignCore] Failed to auto-bootstrap DPoP keys:', err);
        return null;
      });
    }
  }

  public static getInstance(config: SovereignClientCoreConfig): SovereignClientCore {
    if (!SovereignClientCore.instance)
      SovereignClientCore.instance = new SovereignClientCore(config);
    return SovereignClientCore.instance;
  }

  public async bootstrap(): Promise<JsonWebKey | null> {
    return this.bootstrapAutoDPoP();
  }

  private async bootstrapAutoDPoP(): Promise<JsonWebKey | null> {
    if (!this.dpopSigner && (this.dpopConfig || this.enableAutoDPoP)) {
      const alg = this.dpopAlgorithm ?? this.dpopConfig?.algorithm;
      this.dpopSigner = await DPoPSigner.create(
        this.cryptoProvider as unknown as IDPoPCryptoProvider,
        {
          ...(alg && { algorithm: alg }),
        },
      );
    }
    return this.dpopSigner ? this.dpopSigner.getPublicKeyJwk() : null;
  }

  public getDPoPPublicKey(): JsonWebKey | null {
    return this.dpopSigner ? this.dpopSigner.getPublicKeyJwk() : null;
  }

  public get isFrozen(): boolean {
    return this._isFrozen;
  }

  public get isIntegrityCompromised(): boolean {
    return this.memoryQueue.isIntegrityCompromised || this.memoryQueue.getLocked();
  }

  /**
   * Dispatches the request immediately if online, or traps network/503 errors
   * and sequesters the request payload in the volatile RAM queue.
   */
  public async executeRequest<T>(
    requestId: string,
    request: SovereignAdapterRequest,
    dpop?: PendingDPoPContext,
    config?: SovereignRequestConfig,
  ): Promise<T> {
    if (this.isIntegrityCompromised)
      throw new IntegrityBreachError('[SovereignCore] Execution blocked. Memory is frozen.');
    if (!this.networkAdapter)
      throw new Error('[SovereignCore] executeRequest() requires a networkAdapter.');
    if (this.dpopBootstrapPromise) await this.dpopBootstrapPromise;

    const online = await this.isOnline();

    if (online && !this.isProcessingQueue) {
      try {
        let dispatchRequest = request;
        const activeDpop = resolveDPoPContext(
          request,
          this.dpopSigner,
          this.dpopConfig,
          dpop,
          config,
        );

        // Generate fresh DPoP proof at the moment of dispatch
        if (activeDpop) {
          const context = await activeDpop.contextResolver();
          const proofOptions: {
            method: string;
            url: string;
            accessToken?: string;
            nonce?: string;
          } = {
            method: activeDpop.method,
            url: activeDpop.url,
          };
          if (context.accessToken !== undefined) proofOptions.accessToken = context.accessToken;
          if (context.nonce !== undefined) proofOptions.nonce = context.nonce;

          const proof = await activeDpop.signer.generateProof(proofOptions);
          if (request.encodedHeaders !== undefined) {
            dispatchRequest = {
              ...request,
              encodedHeaders: appendHeaderToBinary(
                request.encodedHeaders ?? new Uint8Array(0),
                'DPoP',
                proof,
              ),
            };
          } else {
            dispatchRequest = { ...request, headers: { ...(request.headers || {}), DPoP: proof } };
          }
        }

        const response = await this.networkAdapter.request<T>(dispatchRequest);

        // Memory safety: fill request buffers with 0s after use
        zeroRequestBuffers(request);
        if (dispatchRequest !== request) zeroRequestBuffers(dispatchRequest);
        return response.data;
      } catch (error) {
        if (shouldFreezeSession(error, this.trapping)) {
          const freezeDpop = resolveDPoPContext(
            request,
            this.dpopSigner,
            this.dpopConfig,
            dpop,
            config,
          );
          return this.enqueueStructuredRequest<T>(requestId, request, freezeDpop, config, error);
        }
        zeroRequestBuffers(request);
        throw error;
      }
    }

    const queueDpop = resolveDPoPContext(request, this.dpopSigner, this.dpopConfig, dpop, config);
    return this.enqueueStructuredRequest<T>(
      requestId,
      request,
      queueDpop,
      config,
      new Error('Offline or processing queue'),
    );
  }

  /**
   * Replays enqueued requests sequentially after establishing connectivity legitimacy.
   */
  public async processSynchronizedQueue(handshakeValidator: () => Promise<boolean>): Promise<void> {
    if (this.isIntegrityCompromised)
      throw new IntegrityBreachError(
        '[SovereignCore] Ledger integrity compromised. Execution blocked.',
      );
    if (this.dpopBootstrapPromise) await this.dpopBootstrapPromise;
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      // Challenge the network interface before replaying sensitive client data
      if (!(await handshakeValidator())) {
        this.purgeAll();
        throw new Error('[SovereignCore] Handshake failed. Hostile network. RAM purged.');
      }

      // Check for RAM integrity tampering before reading blocks
      if (
        !(await this.memoryQueue.verifyLedgerIntegrity(this.cryptoProvider)) ||
        this.memoryQueue.isIntegrityCompromised
      ) {
        this.memoryQueue.suspendAndFreezeLedger();
        this.observers?.onIntegrityBreach?.();
        throw new IntegrityBreachError(
          '[SovereignCore] Ledger integrity compromised. Execution blocked.',
        );
      }

      const executionOrder = this.memoryQueue.getExecutionOrder();

      for (const id of executionOrder) {
        const block = this.memoryQueue.getPayload(id);
        if (!block) continue;

        if (this.pendingRequests.has(id) && this.networkAdapter) {
          const pending = this.pendingRequests.get(id)!;
          try {
            const deserialized = deserializeAdapterRequest(block.serializedRequest);
            if (!deserialized) {
              pending.reject(
                new Error(`[SovereignCore] Transaction [${id}] buffer was zeroized before replay.`),
              );
              this.pendingRequests.delete(id);
              await this.memoryQueue.dequeue(this.cryptoProvider, id);
              continue;
            }

            let dispatchRequest = deserialized;
            let activeDpop = pending.dpop;

            // Auto-detect and configure DPoP if access tokens are used in headers
            if (!activeDpop && this.enableAutoDPoP && this.dpopSigner) {
              let authHeaderValue: string | undefined;
              let requiresDPoP = false;

              if (deserialized.encodedHeaders && deserialized.encodedHeaders.length > 0) {
                const decoded = decodeHeaders(deserialized.encodedHeaders);
                authHeaderValue = decoded['Authorization'] || decoded['authorization'];
                if (decoded['DPoP'] !== undefined || decoded['dpop'] !== undefined)
                  requiresDPoP = true;
              }

              let accessToken: string | undefined;
              if (authHeaderValue && authHeaderValue.toLowerCase().startsWith('dpop ')) {
                accessToken = authHeaderValue.slice(5).trim();
                requiresDPoP = true;
              }

              if (requiresDPoP) {
                activeDpop = {
                  signer: this.dpopSigner,
                  method: deserialized.method,
                  url: deserialized.url,
                  contextResolver: () => (accessToken !== undefined ? { accessToken } : {}),
                };
              }
            }

            if (activeDpop) {
              const context = await activeDpop.contextResolver();
              const proofOptions: {
                method: string;
                url: string;
                accessToken?: string;
                nonce?: string;
              } = {
                method: activeDpop.method,
                url: activeDpop.url,
              };
              if (context.accessToken !== undefined) proofOptions.accessToken = context.accessToken;
              if (context.nonce !== undefined) proofOptions.nonce = context.nonce;
              const proof = await activeDpop.signer.generateProof(proofOptions);
              dispatchRequest = {
                ...deserialized,
                encodedHeaders: appendHeaderToBinary(
                  deserialized.encodedHeaders ?? new Uint8Array(0),
                  'DPoP',
                  proof,
                ),
              };
            }

            const response = await this.networkAdapter.request<unknown>(dispatchRequest);
            await this.memoryQueue.dequeue(this.cryptoProvider, id);
            this.pendingRequests.delete(id);
            pending.resolve(response.data);
            zeroRequestBuffers(deserialized);
            if (dispatchRequest !== deserialized) zeroRequestBuffers(dispatchRequest);
          } catch (err) {
            pending.reject(err);
            break;
          }
        } else {
          await this.memoryQueue.dequeue(this.cryptoProvider, id);
          this.pendingRequests.delete(id);
        }
      }

      if (this._isFrozen && this.memoryQueue.size === 0) {
        this._isFrozen = false;
        this.observers?.onSessionResume?.();
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private enqueueStructuredRequest<T>(
    id: string,
    request: SovereignAdapterRequest,
    dpop?: PendingDPoPContext,
    config?: SovereignRequestConfig,
    freezeReason?: unknown,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ttl = config?.ttl ?? this.defaultTTL;
      const binaryRequest = serializeAdapterRequest(request);
      zeroRequestBuffers(request);

      if (!this._isFrozen) {
        this._isFrozen = true;
        this.observers?.onSessionFreeze?.(freezeReason);
      }

      const onExpiry = (expiredId: string): void => {
        const pending = this.pendingRequests.get(expiredId);
        if (pending) {
          pending.reject(new Error(`[SovereignCore] Transaction [${expiredId}] expired in RAM.`));
          this.pendingRequests.delete(expiredId);
        }
      };

      this.memoryQueue
        .enqueue(this.cryptoProvider, id, binaryRequest, ttl, onExpiry)
        .then(() => {
          this.pendingRequests.set(id, {
            resolve: resolve as (v: unknown) => void,
            reject,
            ...(dpop && { dpop }),
          });
        })
        .catch(reject);
    });
  }

  public purgeAll(): void {
    this.memoryQueue.clearAll();
    this.memoryQueue.isIntegrityCompromised = false;
    const purgeError = new Error(
      '[SovereignCore] Session purged. All pending transactions rejected.',
    );
    for (const [, record] of this.pendingRequests) record.reject(purgeError);
    this.pendingRequests.clear();
    this._isFrozen = false;
    this.observers?.onSessionPurge?.(purgeError);
  }
}
