import type {
  NetworkStatusResolver,
  SovereignClientCoreConfig,
  SovereignRequestConfig,
} from '../types.js';
import type { ISovereignCryptoProvider } from '../contracts/index.js';
import { SovereignMemoryQueue } from '../ledger/index.js';
import { resolveTrappingConfig, type ResolvedTrappingConfig } from './config.js';
import { shouldFreezeSession } from './error-matrix.js';

/**
 * SovereignClientCore
 *
 * The global-singleton orchestrator of the SovereignCore framework.
 *
 * Singleton Contract:
 * Only one instance exists per JS runtime. Call SovereignClientCore.getInstance(config).
 */
export class SovereignClientCore {
  private static instance: SovereignClientCore;

  private readonly memoryQueue: SovereignMemoryQueue;
  private readonly cryptoProvider: ISovereignCryptoProvider;
  private readonly isOnline: NetworkStatusResolver;
  private readonly defaultTTL: number;
  private readonly trapping: ResolvedTrappingConfig;

  private isProcessingQueue = false;

  private readonly executors = new Map<string, () => Promise<unknown>>();

  private constructor(config: SovereignClientCoreConfig) {
    this.cryptoProvider = config.cryptoProvider;
    this.isOnline = config.networkResolver;
    this.defaultTTL = config.defaultTTL ?? 60_000;
    this.memoryQueue = SovereignMemoryQueue.getInstance();
    this.trapping = resolveTrappingConfig(config.errorTrapping);
  }

  public static getInstance(config: SovereignClientCoreConfig): SovereignClientCore {
    if (!SovereignClientCore.instance) {
      SovereignClientCore.instance = new SovereignClientCore(config);
    }
    return SovereignClientCore.instance;
  }

  public async execute<T>(
    requestId: string,
    executor: () => Promise<T>,
    metaData: object,
    config?: SovereignRequestConfig
  ): Promise<T> {
    const online = await this.isOnline();

    if (online && !this.isProcessingQueue) {
      try {
        return await executor();
      } catch (error) {
        if (shouldFreezeSession(error, this.trapping)) {
          return this.enqueueForRetry(requestId, executor, metaData, config);
        }
        throw error;
      }
    }

    return this.enqueueForRetry(requestId, executor, metaData, config);
  }

  public async processSynchronizedQueue(
    handshakeValidator: () => Promise<boolean>
  ): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      const isChannelValid = await handshakeValidator();
      if (!isChannelValid) {
        this.purgeAll();
        throw new Error('[SovereignCore] Handshake failed. Hostile network. RAM purged.');
      }

      const isLedgerIntact = await this.memoryQueue.verifyLedgerIntegrity(
        this.cryptoProvider
      );
      if (!isLedgerIntact) {
        this.purgeAll();
        throw new Error('[SovereignCore] Ledger integrity compromised. RAM purged.');
      }

      const executionOrder = this.memoryQueue.getExecutionOrder();

      for (const id of executionOrder) {
        if (!this.memoryQueue.getPayload(id)) continue;

        try {
          const trigger = this.executors.get(id);
          if (trigger) await trigger();

          await this.memoryQueue.dequeue(this.cryptoProvider, id);
          this.executors.delete(id);
        } catch {
          break;
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private enqueueForRetry<T>(
    id: string,
    executor: () => Promise<T>,
    metaData: object,
    config?: SovereignRequestConfig
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ttl = config?.ttl ?? this.defaultTTL;
      const serializedData = new TextEncoder().encode(JSON.stringify(metaData));

      const onExpiry = (expiredId: string): void => {
        this.executors.delete(expiredId);
        reject(
          new Error(
            `[SovereignCore] Transaction [${expiredId}] expired inside RAM boundary.`
          )
        );
      };

      this.memoryQueue
        .enqueue(this.cryptoProvider, id, serializedData, ttl, onExpiry)
        .then(() => {
          this.executors.set(id, async () => {
            const result = await executor();
            resolve(result);
          });
        })
        .catch(reject);
    });
  }

  private purgeAll(): void {
    this.memoryQueue.clearAll();
    this.executors.clear();
  }
}
