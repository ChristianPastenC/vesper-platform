export interface ISovereignCryptoProvider {
  getRandomBytes(byteLength: number): Uint8Array;
  sha256(data: Uint8Array): Promise<Uint8Array>;
}

export interface SovereignRequestConfig {
  ttl?: number;
}

export interface QueuedPayload {
  id: string;
  serializedRequest: Uint8Array;
  timestamp: number;
  ttl: number;
  expiryTimer: any;
}

export type NetworkStatusResolver = () => Promise<boolean>;

export class SovereignMemoryQueue {
  private static instance: SovereignMemoryQueue;
  private registry = new Map<string, QueuedPayload>();
  private fifoOrder: string[] = [];

  private constructor() { }

  public static getInstance(): SovereignMemoryQueue {
    if (!SovereignMemoryQueue.instance) {
      SovereignMemoryQueue.instance = new SovereignMemoryQueue();
    }
    return SovereignMemoryQueue.instance;
  }

  public enqueue(id: string, binaryPayload: Uint8Array, ttl: number, onExpire: (id: string) => void): void {
    if (this.registry.has(id)) {
      this.activeZeroization(id);
    }

    const expiryTimer = setTimeout(() => {
      onExpire(id);
      this.activeZeroization(id);
    }, ttl);

    this.registry.set(id, { id, serializedRequest: binaryPayload, timestamp: Date.now(), ttl, expiryTimer });
    this.fifoOrder.push(id);
  }

  public getExecutionOrder(): string[] {
    return [...this.fifoOrder];
  }

  public getPayload(id: string): QueuedPayload | undefined {
    return this.registry.get(id);
  }

  public dequeue(id: string): void {
    const item = this.registry.get(id);
    if (item) {
      clearTimeout(item.expiryTimer);
      this.registry.delete(id);
    }
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);
  }

  public activeZeroization(id: string): void {
    const item = this.registry.get(id);
    if (item) {
      clearTimeout(item.expiryTimer);
      item.serializedRequest.fill(0);
      this.registry.delete(id);
    }
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);
  }

  public clearAll(): void {
    const keys = Array.from(this.registry.keys());
    for (const key of keys) {
      this.activeZeroization(key);
    }
    this.fifoOrder = [];
  }
}

export class SovereignClientCore {
  private memoryQueue = SovereignMemoryQueue.getInstance();
  private cryptoProvider: ISovereignCryptoProvider;
  private isOnline: NetworkStatusResolver;
  private defaultTTL: number;
  private isProcessingQueue = false;
  private executors = new Map<string, () => Promise<any>>();

  constructor(config: {
    cryptoProvider: ISovereignCryptoProvider;
    networkResolver: NetworkStatusResolver;
    defaultTTL?: number;
  }) {
    this.cryptoProvider = config.cryptoProvider;
    this.isOnline = config.networkResolver;
    this.defaultTTL = config.defaultTTL || 60000;
  }

  public async execute<T>(
    requestId: string,
    executor: () => Promise<T>,
    metaDataToSerialize: object,
    config?: SovereignRequestConfig
  ): Promise<T> {
    const online = await this.isOnline();

    if (online && !this.isProcessingQueue) {
      try {
        return await executor();
      } catch (error) {
        if (this.isNetworkError(error)) {
          return this.handleOfflineDivergence(requestId, executor, metaDataToSerialize, config);
        }
        throw error;
      }
    }

    return this.handleOfflineDivergence(requestId, executor, metaDataToSerialize, config);
  }

  private async handleOfflineDivergence<T>(
    id: string,
    executor: () => Promise<T>,
    metaData: object,
    config?: SovereignRequestConfig
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const ttl = config?.ttl || this.defaultTTL;
      const encoder = new TextEncoder();
      const serializedData = encoder.encode(JSON.stringify(metaData));

      const onExpiryCallback = (expiredId: string) => {
        this.executors.delete(expiredId);
        reject(new Error(`[SovereignCore] Transaction [${expiredId}] expired inside RAM boundary.`));
      };

      this.memoryQueue.enqueue(id, serializedData, ttl, onExpiryCallback);

      this.executors.set(id, async () => {
        try {
          const result = await executor();
          resolve(result);
        } catch (err) {
          reject(err);
          throw err;
        }
      });
    });
  }

  public async processSynchronizedQueue(handshakeValidator: () => Promise<boolean>): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      const isChannelValid = await handshakeValidator();
      if (!isChannelValid) {
        this.memoryQueue.clearAll();
        this.executors.clear();
        throw new Error("[SovereignCore] Handshake failed. Hostile network. RAM purged.");
      }

      const executionOrder = this.memoryQueue.getExecutionOrder();

      for (const id of executionOrder) {
        const item = this.memoryQueue.getPayload(id);
        if (!item) continue;

        try {
          const trigger = this.executors.get(id);
          if (trigger) {
            await trigger();
          }
          this.memoryQueue.dequeue(id);
          this.executors.delete(id);
        } catch (execError) {
          break;
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private isNetworkError(error: any): boolean {
    if (error && error.isAxiosError && !error.response) return true;
    if (error instanceof TypeError && error.message === 'Network request failed') return true;
    if (error && error.networkError) return true;
    return false;
  }
}