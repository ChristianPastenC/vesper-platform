import { IntegrityBreachError, type LedgerBlock } from '../types.js';
import type { ISovereignCryptoProvider } from '../contracts/index.js';
import { computeBlockHash, constantTimeEqual, genesisVector } from '../crypto.js';
import { zeroizeBlock } from './zeroization.js';

/**
 * SovereignMemoryQueue
 * In-memory ledger chaining transactions via SHA-256 hashes (similar to a block chain).
 * Enables real-time detection of RAM modification/bit-flipping attacks.
 */
export class SovereignMemoryQueue {
  private static instance: SovereignMemoryQueue;
  private readonly registry = new Map<string, LedgerBlock>();
  private fifoOrder: string[] = [];
  public isIntegrityCompromised = false;
  private isLocked = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private watchdogTimer?: any;
  private isWatchdogRunning = false;

  private constructor() {}

  public static getInstance(): SovereignMemoryQueue {
    if (!SovereignMemoryQueue.instance) {
      SovereignMemoryQueue.instance = new SovereignMemoryQueue();
    }
    return SovereignMemoryQueue.instance;
  }

  public get size(): number {
    return this.registry.size;
  }

  /**
   * Chains and pushes a request payload to the volatile ledger.
   * Sets up a timeout trigger for active zeroization upon TTL expiry.
   */
  public async enqueue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
    binaryPayload: Uint8Array,
    ttl: number,
    onExpire: (id: string) => void
  ): Promise<void> {
    if (this.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (this.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    if (this.registry.has(id)) {
      await this.activeZeroization(cryptoProvider, id);
    }

    const previousHash = this.resolvePreviousHash();
    const expiryTimer = setTimeout(async () => {
      onExpire(id);
      await this.activeZeroization(cryptoProvider, id);
    }, ttl);

    const timestamp = Date.now();
    const hash = await computeBlockHash(cryptoProvider, binaryPayload, previousHash, timestamp);

    this.registry.set(id, {
      id,
      serializedRequest: binaryPayload,
      timestamp,
      ttl,
      expiryTimer,
      previousHash,
      currentHash: hash,
      isZeroized: false,
    });
    this.fifoOrder.push(id);
  }

  public getExecutionOrder(): string[] {
    return [...this.fifoOrder];
  }

  public getPayload(id: string): LedgerBlock | undefined {
    return this.registry.get(id);
  }

  /**
   * Safely removes request from ledger, zeroing out its payload buffers,
   * then updates the hash chain.
   */
  public async dequeue(cryptoProvider: ISovereignCryptoProvider, id: string): Promise<void> {
    if (this.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (this.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const item = this.registry.get(id);
    if (!item) return;

    clearTimeout(item.expiryTimer);
    zeroizeBlock(item);
    this.registry.delete(id);
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);
    await this.rechainLedger(cryptoProvider);
  }

  /**
   * Performs proactive payload zeroization upon timeout expiry, rechaining subsequent blocks.
   */
  public async activeZeroization(cryptoProvider: ISovereignCryptoProvider, id: string): Promise<void> {
    if (this.isLocked) throw new IntegrityBreachError('[SovereignCore] Ledger locked.');
    if (this.isIntegrityCompromised) throw new Error('[SovereignCore] Ledger compromised.');

    const item = this.registry.get(id);
    if (!item) return;

    clearTimeout(item.expiryTimer);
    zeroizeBlock(item);
    this.registry.delete(id);
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);
    await this.rechainLedger(cryptoProvider);
  }

  public clearAll(): void {
    for (const [, item] of this.registry) {
      clearTimeout(item.expiryTimer);
      zeroizeBlock(item);
    }
    this.registry.clear();
    this.fifoOrder = [];
    this.isLocked = false;
  }

  /**
   * Verifies the cryptographic chain hash links to detect memory corruption or injection.
   */
  public async verifyLedgerIntegrity(cryptoProvider: ISovereignCryptoProvider): Promise<boolean> {
    let expectedPrevHash = genesisVector();

    for (const id of this.fifoOrder) {
      const block = this.registry.get(id);
      if (!block) return false;

      if (!constantTimeEqual(block.previousHash, expectedPrevHash)) return false;

      if (!block.isZeroized) {
        const recomputedHash = await computeBlockHash(
          cryptoProvider,
          block.serializedRequest,
          block.previousHash,
          block.timestamp
        );
        if (!constantTimeEqual(block.currentHash, recomputedHash)) return false;
      }
      expectedPrevHash = new Uint8Array(block.currentHash);
    }
    return true;
  }

  private resolvePreviousHash(): Uint8Array {
    if (this.fifoOrder.length === 0) return genesisVector();
    const tailId = this.fifoOrder[this.fifoOrder.length - 1];
    if (tailId === undefined) return genesisVector();
    const tailBlock = this.registry.get(tailId);
    return tailBlock ? new Uint8Array(tailBlock.currentHash) : genesisVector();
  }

  private async rechainLedger(cryptoProvider: ISovereignCryptoProvider): Promise<void> {
    let runningPrevHash = genesisVector();
    for (const id of this.fifoOrder) {
      const block = this.registry.get(id);
      if (!block) continue;

      block.previousHash = new Uint8Array(runningPrevHash);
      block.currentHash = await computeBlockHash(
        cryptoProvider,
        block.serializedRequest,
        block.previousHash,
        block.timestamp
      );
      runningPrevHash = new Uint8Array(block.currentHash);
    }
  }

  /**
   * Starts background integrity monitoring. If validation fails, suspends the queue
   * to preserve evidence for forensics.
   */
  public startWatchdog(
    cryptoProvider: ISovereignCryptoProvider,
    onTamper: () => void,
    intervalMs: number = 1000
  ): void {
    if (this.isWatchdogRunning) return;
    this.isWatchdogRunning = true;

    const tick = async () => {
      if (!this.isWatchdogRunning) return;
      if (this.size > 0) {
        try {
          const intact = await this.verifyLedgerIntegrity(cryptoProvider);
          if (!intact) {
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
      if (typeof this.watchdogTimer.unref === 'function') {
        this.watchdogTimer.unref();
      }
    };

    this.watchdogTimer = setTimeout(tick, intervalMs);
    if (typeof this.watchdogTimer.unref === 'function') {
      this.watchdogTimer.unref();
    }
  }

  /**
   * Locks the queue and freezes timers to prevent auto-zeroization during audit.
   */
  public suspendAndFreezeLedger(): void {
    this.isLocked = true;
    this.isIntegrityCompromised = true;
    this.stopWatchdog();
    for (const [, item] of this.registry) {
      if (item.expiryTimer) clearTimeout(item.expiryTimer);
    }
  }

  public getLocked(): boolean {
    return this.isLocked;
  }

  public stopWatchdog(): void {
    this.isWatchdogRunning = false;
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = undefined;
    }
  }
}
