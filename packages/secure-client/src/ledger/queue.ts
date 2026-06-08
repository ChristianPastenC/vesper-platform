declare const require: (moduleName: string) => any;
import { IntegrityBreachError, type LedgerBlock } from '../types.js';
import type { ISovereignCryptoProvider } from '../contracts/index.js';
import type { SovereignSecureClient } from '../specs/SovereignSecureClient.nitro.js';

// Synchronous SHA-256 helper for Node.js / Web fallback execution
function sha256Sync(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const msg = new Uint8Array(data.length + 1 + ((56 - (data.length + 1) % 64 + 64) % 64) + 8);
  msg.set(data);
  msg[data.length] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(msg.length - 4, data.length * 8, false);

  for (let chunk = 0; chunk < msg.length / 64; ++chunk) {
    const W = new Uint32Array(64);
    for (let t = 0; t < 16; ++t) W[t] = view.getUint32(chunk * 64 + t * 4, false);
    for (let t = 16; t < 64; ++t) {
      const wt15 = W[t-15]!;
      const wt2 = W[t-2]!;
      const s0 = ((wt15 >>> 7) | (wt15 << 25)) ^ ((wt15 >>> 18) | (wt15 << 14)) ^ (wt15 >>> 3);
      const s1 = ((wt2 >>> 17) | (wt2 << 15)) ^ ((wt2 >>> 19) | (wt2 << 13)) ^ (wt2 >>> 10);
      W[t] = (s1 + W[t-7]! + s0 + W[t-16]!) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; ++t) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t]! + W[t]!) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  const hash = new Uint8Array(32);
  const hashView = new DataView(hash.buffer);
  hashView.setUint32(0, h0, false);
  hashView.setUint32(4, h1, false);
  hashView.setUint32(8, h2, false);
  hashView.setUint32(12, h3, false);
  hashView.setUint32(16, h4, false);
  hashView.setUint32(20, h5, false);
  hashView.setUint32(24, h6, false);
  hashView.setUint32(28, h7, false);
  return hash;
}

interface LedgerBlockInternal {
  id: string;
  serializedRequest: Uint8Array;
  timestamp: number;
  ttl: number;
  previousHash: Uint8Array;
  currentHash: Uint8Array;
  isZeroized: boolean;
}

// Memory queue fallback implementation when running outside React Native (Node.js/Jest/SSR)
class SovereignSecureClientFallback {
  private queue: LedgerBlockInternal[] = [];
  private idToIndex = new Map<string, number>();
  private isLocked = false;
  private isIntegrityCompromised = false;
  private isOnline = true;

  public executeTransaction(id: string, serializedRequest: ArrayBuffer, ttl: number): boolean {
    if (this.isLocked || this.isIntegrityCompromised) {
      throw new Error('[SovereignCore] Ledger compromised or locked. Execution blocked.');
    }
    const idx = this.idToIndex.get(id);
    if (idx !== undefined) this.zeroize(id);
    if (this.isOnline) return true;

    const payload = new Uint8Array(serializedRequest);
    const prevHash = this.resolvePreviousHash();
    const timestamp = Date.now();
    const currentHash = this.computeBlockHash(payload, prevHash, timestamp);

    this.queue.push({ id, serializedRequest: payload, timestamp, ttl, previousHash: prevHash, currentHash, isZeroized: false });
    this.idToIndex.set(id, this.queue.length - 1);
    return false;
  }

  public getQueueStatus() {
    return { size: this.queue.length, isLocked: this.isLocked, isIntegrityCompromised: this.isIntegrityCompromised };
  }

  public toggleNetworkSim(online: boolean): void { this.isOnline = online; }

  public dequeueTransaction(id: string): void {
    if (this.isLocked || this.isIntegrityCompromised) {
      throw new Error('[SovereignCore] Ledger compromised or locked. Execution blocked.');
    }
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    const block = this.queue[idx];
    if (block) this.zeroizeBlock(block);
    this.queue.splice(idx, 1);
    this.rechainLedger();
  }

  public verifyIntegrity(): boolean {
    let expectedPrevHash = new Uint8Array(32);
    for (const block of this.queue) {
      if (!this.constantTimeEqual(block.previousHash, expectedPrevHash)) {
        this.isLocked = true; this.isIntegrityCompromised = true; return false;
      }
      if (!block.isZeroized) {
        const recomputed = this.computeBlockHash(block.serializedRequest, block.previousHash, block.timestamp);
        if (!this.constantTimeEqual(block.currentHash, recomputed)) {
          this.isLocked = true; this.isIntegrityCompromised = true; return false;
        }
      }
      expectedPrevHash = new Uint8Array(block.currentHash);
    }
    return true;
  }

  public clearQueue(): void {
    for (const block of this.queue) this.zeroizeBlock(block);
    this.queue = []; this.idToIndex.clear(); this.isLocked = false;
  }

  public zeroize(id: string): void {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    const block = this.queue[idx];
    if (block) this.zeroizeBlock(block);
    this.queue.splice(idx, 1);
    this.rechainLedger();
  }

  public getQueueIds(): string[] { return this.queue.map(b => b.id); }

  public getTransactionPayload(id: string): ArrayBuffer | null {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return null;
    const block = this.queue[idx];
    if (!block || block.isZeroized) return null;
    return block.serializedRequest.buffer.slice(block.serializedRequest.byteOffset, block.serializedRequest.byteOffset + block.serializedRequest.byteLength) as ArrayBuffer;
  }

  private zeroizeBlock(block: LedgerBlockInternal): void {
    block.serializedRequest.fill(0); block.previousHash.fill(0); block.currentHash.fill(0); block.isZeroized = true;
  }

  private computeBlockHash(serializedRequest: Uint8Array, previousHash: Uint8Array, timestamp: number): Uint8Array {
    const tsBytes = new TextEncoder().encode(timestamp.toString());
    const preImage = new Uint8Array(serializedRequest.length + previousHash.length + tsBytes.length);
    preImage.set(serializedRequest, 0);
    preImage.set(previousHash, serializedRequest.length);
    preImage.set(tsBytes, serializedRequest.length + previousHash.length);
    return sha256Sync(preImage);
  }

  private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
    return diff === 0;
  }

  private resolvePreviousHash(): Uint8Array {
    if (this.queue.length === 0) return new Uint8Array(32);
    const lastBlock = this.queue[this.queue.length - 1];
    return lastBlock ? new Uint8Array(lastBlock.currentHash) : new Uint8Array(32);
  }

  private rechainLedger(): void {
    let runningPrevHash = new Uint8Array(32);
    this.idToIndex.clear();
    for (let i = 0; i < this.queue.length; i++) {
      const block = this.queue[i];
      if (!block) continue;
      block.previousHash = runningPrevHash;
      if (!block.isZeroized) block.currentHash = this.computeBlockHash(block.serializedRequest, block.previousHash, block.timestamp);
      runningPrevHash = new Uint8Array(block.currentHash);
      this.idToIndex.set(block.id, i);
    }
  }
}

// Load native JSI object in React Native Hermes, node addon in desktop, or fallback to pure JS
let nativeClient: SovereignSecureClient;
const isHermes = typeof (globalThis as any).HermesInternal !== 'undefined';

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
  private readonly expiryTimers = new Map<string, any>();
  private watchdogTimer?: any;
  private isWatchdogRunning = false;

  private constructor() {}

  public static getInstance(): SovereignMemoryQueue {
    if (!SovereignMemoryQueue.instance) SovereignMemoryQueue.instance = new SovereignMemoryQueue();
    return SovereignMemoryQueue.instance;
  }

  public get size(): number { return nativeClient.getQueueStatus().size; }

  public get isIntegrityCompromised(): boolean { return nativeClient.getQueueStatus().isIntegrityCompromised; }
  public set isIntegrityCompromised(value: boolean) {}

  public async enqueue(cryptoProvider: ISovereignCryptoProvider, id: string, binaryPayload: Uint8Array, ttl: number, onExpire: (id: string) => void): Promise<void> {
    const status = nativeClient.getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const existingTimer = this.expiryTimers.get(id);
    if (existingTimer) { clearTimeout(existingTimer); this.expiryTimers.delete(id); }

    const expiryTimer = setTimeout(async () => {
      onExpire(id);
      await this.activeZeroization(cryptoProvider, id);
    }, ttl);

    this.expiryTimers.set(id, expiryTimer);

    const exactBuffer = binaryPayload.buffer.slice(binaryPayload.byteOffset, binaryPayload.byteOffset + binaryPayload.byteLength) as ArrayBuffer;
    nativeClient.executeTransaction(id, exactBuffer, ttl);
  }

  public getExecutionOrder(): string[] { return nativeClient.getQueueIds(); }

  public getPayload(id: string): LedgerBlock | undefined {
    const rawPayload = nativeClient.getTransactionPayload(id);
    return rawPayload ? { id, serializedRequest: new Uint8Array(rawPayload), timestamp: 0, ttl: 0, expiryTimer: undefined, previousHash: new Uint8Array(0), currentHash: new Uint8Array(0), isZeroized: false } : undefined;
  }

  public async dequeue(cryptoProvider: ISovereignCryptoProvider, id: string): Promise<void> {
    const status = nativeClient.getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const timer = this.expiryTimers.get(id);
    if (timer) { clearTimeout(timer); this.expiryTimers.delete(id); }
    nativeClient.dequeueTransaction(id);
  }

  public async activeZeroization(cryptoProvider: ISovereignCryptoProvider, id: string): Promise<void> {
    const status = nativeClient.getQueueStatus();
    if (status.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (status.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const timer = this.expiryTimers.get(id);
    if (timer) { clearTimeout(timer); this.expiryTimers.delete(id); }
    nativeClient.zeroize(id);
  }

  public clearAll(): void {
    for (const [, timer] of this.expiryTimers) clearTimeout(timer);
    this.expiryTimers.clear();
    nativeClient.clearQueue();
  }

  public async verifyLedgerIntegrity(cryptoProvider: ISovereignCryptoProvider): Promise<boolean> { return nativeClient.verifyIntegrity(); }

  public startWatchdog(cryptoProvider: ISovereignCryptoProvider, onTamper: () => void, intervalMs: number = 1000): void {
    if (this.isWatchdogRunning) return;
    this.isWatchdogRunning = true;
    const tick = async () => {
      if (!this.isWatchdogRunning) return;
      if (this.size > 0) {
        try {
          if (!nativeClient.verifyIntegrity()) { this.suspendAndFreezeLedger(); onTamper(); return; }
        } catch { this.suspendAndFreezeLedger(); onTamper(); return; }
      }
      this.watchdogTimer = setTimeout(tick, intervalMs);
      if (typeof this.watchdogTimer.unref === 'function') this.watchdogTimer.unref();
    };
    this.watchdogTimer = setTimeout(tick, intervalMs);
    if (typeof this.watchdogTimer.unref === 'function') this.watchdogTimer.unref();
  }

  public suspendAndFreezeLedger(): void {
    this.stopWatchdog();
    for (const [, timer] of this.expiryTimers) clearTimeout(timer);
    this.expiryTimers.clear();
  }

  public getLocked(): boolean { return nativeClient.getQueueStatus().isLocked; }

  public stopWatchdog(): void {
    this.isWatchdogRunning = false;
    if (this.watchdogTimer) { clearTimeout(this.watchdogTimer); this.watchdogTimer = undefined; }
  }
}
