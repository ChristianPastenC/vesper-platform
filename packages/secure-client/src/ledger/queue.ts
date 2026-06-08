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
let nativeClient: SovereignSecureClient;
const isHermes = typeof (globalThis as Record<string, unknown>).HermesInternal !== 'undefined';

if (isHermes) {
  try {
    const { NitroModules } = require('react-native-nitro-modules');
    nativeClient = NitroModules.createHybridObject('SovereignSecureClient');
  } catch (e) {
    nativeClient = new SovereignSecureClientFallback() as unknown as SovereignSecureClient;
  }
} else {
  try {
    nativeClient = require('./SovereignSecureClient.node');
  } catch (e) {
    nativeClient = new SovereignSecureClientFallback() as unknown as SovereignSecureClient;
  }
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
    return nativeClient.getQueueStatus().size;
  }

  public get isIntegrityCompromised(): boolean {
    return nativeClient.getQueueStatus().isIntegrityCompromised;
  }
  public set isIntegrityCompromised(value: boolean) {}

  public async enqueue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
    binaryPayload: Uint8Array,
    ttl: number,
    onExpire: (id: string) => void,
  ): Promise<void> {
    const status = nativeClient.getQueueStatus();
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
    nativeClient.executeTransaction(id, exactBuffer, ttl);
  }

  public getExecutionOrder(): string[] {
    return nativeClient.getQueueIds();
  }

  public getPayload(id: string): LedgerBlock | undefined {
    const rawPayload = nativeClient.getTransactionPayload(id);
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
    const status = nativeClient.getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const timer = this.expiryTimers.get(id);
    if (timer) {
      clearTimeout(timer as number);
      this.expiryTimers.delete(id);
    }
    nativeClient.dequeueTransaction(id);
  }

  public async activeZeroization(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
  ): Promise<void> {
    const status = nativeClient.getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const timer = this.expiryTimers.get(id);
    if (timer) {
      clearTimeout(timer as number);
      this.expiryTimers.delete(id);
    }
    nativeClient.zeroize(id);
  }

  public clearAll(): void {
    for (const [, timer] of this.expiryTimers) {
      clearTimeout(timer as number);
    }
    this.expiryTimers.clear();
    nativeClient.clearQueue();
  }

  public async verifyLedgerIntegrity(_cryptoProvider: ISovereignCryptoProvider): Promise<boolean> {
    return nativeClient.verifyIntegrity();
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
          if (!nativeClient.verifyIntegrity()) {
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
    return nativeClient.getQueueStatus().isLocked;
  }

  public stopWatchdog(): void {
    this.isWatchdogRunning = false;
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer as number);
      this.watchdogTimer = undefined;
    }
  }
}
