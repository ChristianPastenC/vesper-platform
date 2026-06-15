interface NodeRequire {
  (moduleName: 'react-native-nitro-modules'): {
    NitroModules: { createHybridObject: (name: string) => SovereignSecureClient };
  };
  (moduleName: './SovereignSecureClient.node'): SovereignSecureClient;
  (moduleName: string): unknown;
}
declare const require: NodeRequire;

import { IntegrityBreachError, type LedgerBlock } from '../types.js';
import type { ISovereignCryptoProvider } from '../contracts/index.js';
import type { SovereignSecureClient } from '../specs/SovereignSecureClient.nitro.js';
import { SovereignSecureClientFallback } from './fallback.js';

// Load native JSI object in React Native Hermes, node addon in desktop, or fallback to pure JS
let nativeClient: SovereignSecureClient | null = null;
let forcedMock = false;

export const configureQueueEngine = (options: { mock?: boolean | undefined }): void => {
  if (options.mock) {
    forcedMock = true;
    nativeClient = new SovereignSecureClientFallback() as unknown as SovereignSecureClient;
  }
};

const getNativeClient = (): SovereignSecureClient => {
  if (nativeClient) return nativeClient;

  const isMockEnv =
    forcedMock ||
    (typeof globalThis !== 'undefined' &&
      (globalThis as Record<string, unknown>).__SOVEREIGN_MOCK__ === true);

  if (isMockEnv) {
    nativeClient = new SovereignSecureClientFallback() as unknown as SovereignSecureClient;
    return nativeClient;
  }

  const isHermes = typeof (globalThis as Record<string, unknown>).HermesInternal !== 'undefined';

  if (isHermes) {
    try {
      // Use dynamic string name to prevent Metro/Webpack from statically failing on this optional peer dependency
      const nitroModuleName = 'react-native-nitro-modules';
      const { NitroModules } = require(nitroModuleName);
      nativeClient = NitroModules.createHybridObject('SovereignSecureClient');
    } catch {
      nativeClient = new SovereignSecureClientFallback() as unknown as SovereignSecureClient;
    }
  } else {
    try {
      nativeClient = require('./SovereignSecureClient.node');
    } catch {
      nativeClient = new SovereignSecureClientFallback() as unknown as SovereignSecureClient;
    }
  }
  return nativeClient!;
}

export class SovereignMemoryQueue {
  private static instance: SovereignMemoryQueue;
  private readonly expiryTimers = new Map<string, unknown>();
  private watchdogTimer?: unknown;
  private isWatchdogRunning = false;

  private constructor() {}

  public static getInstance(): SovereignMemoryQueue {
    if (!SovereignMemoryQueue.instance) SovereignMemoryQueue.instance = new SovereignMemoryQueue();
    return SovereignMemoryQueue.instance;
  }

  public get size(): number {
    return getNativeClient().getQueueStatus().size;
  }

  public get isIntegrityCompromised(): boolean {
    return getNativeClient().getQueueStatus().isIntegrityCompromised;
  }
  public set isIntegrityCompromised(value: boolean) {}

  public async enqueue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
    binaryPayload: Uint8Array,
    ttl: number,
    onExpire: (id: string) => void,
  ): Promise<void> {
    const status = getNativeClient().getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const existingTimer = this.expiryTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer as number);
      this.expiryTimers.delete(id);
    }

    const expiryTimer = setTimeout(async () => {
      onExpire(id);
      await this.activeZeroization(cryptoProvider, id);
    }, ttl);

    this.expiryTimers.set(id, expiryTimer);

    const exactBuffer = binaryPayload.buffer.slice(
      binaryPayload.byteOffset,
      binaryPayload.byteOffset + binaryPayload.byteLength,
    ) as ArrayBuffer;
    getNativeClient().executeTransaction(id, exactBuffer, ttl);
  }

  public getExecutionOrder(): string[] {
    return getNativeClient().getQueueIds();
  }

  public getPayload(id: string): LedgerBlock | undefined {
    const rawPayload = getNativeClient().getTransactionPayload(id);
    return rawPayload
      ? {
          id,
          serializedRequest: new Uint8Array(rawPayload),
          timestamp: 0,
          ttl: 0,
          expiryTimer: undefined,
          previousHash: new Uint8Array(0),
          currentHash: new Uint8Array(0),
          isZeroized: false,
        }
      : undefined;
  }

  public async dequeue(cryptoProvider: ISovereignCryptoProvider, id: string): Promise<void> {
    const status = getNativeClient().getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const timer = this.expiryTimers.get(id);
    if (timer) {
      clearTimeout(timer as number);
      this.expiryTimers.delete(id);
    }
    getNativeClient().dequeueTransaction(id);
  }

  public async activeZeroization(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
  ): Promise<void> {
    const status = getNativeClient().getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const timer = this.expiryTimers.get(id);
    if (timer) {
      clearTimeout(timer as number);
      this.expiryTimers.delete(id);
    }
    getNativeClient().zeroize(id);
  }

  public clearAll(): void {
    for (const [, timer] of this.expiryTimers) {
      clearTimeout(timer as number);
    }
    this.expiryTimers.clear();
    getNativeClient().clearQueue();
  }

  public async verifyLedgerIntegrity(_cryptoProvider: ISovereignCryptoProvider): Promise<boolean> {
    return getNativeClient().verifyIntegrity();
  }

  public startWatchdog(
    _cryptoProvider: ISovereignCryptoProvider,
    onTamper: () => void,
    intervalMs: number = 1000,
  ): void {
    if (this.isWatchdogRunning) return;
    this.isWatchdogRunning = true;
    const tick = async () => {
      if (!this.isWatchdogRunning) return;
      if (this.size > 0) {
        try {
          if (!getNativeClient().verifyIntegrity()) {
            this.suspendAndFreezeLedger();
            onTamper();
            return;
          }
        } catch {
          this.suspendAndFreezeLedger();
          onTamper();
          return;
        }
      }
      this.watchdogTimer = setTimeout(tick, intervalMs);
      const t = this.watchdogTimer as { unref?: () => void } | undefined;
      if (t && typeof t.unref === 'function') t.unref();
    };
    this.watchdogTimer = setTimeout(tick, intervalMs);
    const w = this.watchdogTimer as { unref?: () => void } | undefined;
    if (w && typeof w.unref === 'function') w.unref();
  }

  public suspendAndFreezeLedger(): void {
    this.stopWatchdog();
    for (const [, timer] of this.expiryTimers) {
      clearTimeout(timer as number);
    }
    this.expiryTimers.clear();
  }

  public getLocked(): boolean {
    return getNativeClient().getQueueStatus().isLocked;
  }

  public stopWatchdog(): void {
    this.isWatchdogRunning = false;
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer as number);
      this.watchdogTimer = undefined;
    }
  }
}
