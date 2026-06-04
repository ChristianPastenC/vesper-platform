import type { LedgerBlock } from '../types.js';
import type { ISovereignCryptoProvider } from '../contracts/index.js';
import { computeBlockHash, constantTimeEqual, genesisVector } from '../crypto.js';
import { zeroizeBlock } from './zeroization.js';

/**
 * SovereignMemoryQueue
 *
 * A global-singleton, in-memory FIFO transaction ledger whose entries are
 * cryptographically chained using SHA-256 — analogous to a miniature
 * append-only blockchain operating entirely inside volatile RAM.
 *
 * Singleton Contract:
 * Only one instance exists per JS runtime. All calls to
 * SovereignMemoryQueue.getInstance() return the SAME object.
 */
export class SovereignMemoryQueue {
  private static instance: SovereignMemoryQueue;

  private readonly registry = new Map<string, LedgerBlock>();
  private fifoOrder: string[] = [];

  private constructor() { }

  public static getInstance(): SovereignMemoryQueue {
    if (!SovereignMemoryQueue.instance) {
      SovereignMemoryQueue.instance = new SovereignMemoryQueue();
    }
    return SovereignMemoryQueue.instance;
  }

  public get size(): number {
    return this.registry.size;
  }

  public async enqueue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
    binaryPayload: Uint8Array,
    ttl: number,
    onExpire: (id: string) => void
  ): Promise<void> {
    if (this.registry.has(id)) {
      await this.activeZeroization(cryptoProvider, id);
    }

    const previousHash = this.resolvePreviousHash();

    const expiryTimer = setTimeout(async () => {
      onExpire(id);
      await this.activeZeroization(cryptoProvider, id);
    }, ttl);

    const timestamp = Date.now();
    const hash = await computeBlockHash(
      cryptoProvider,
      id,
      binaryPayload,
      timestamp,
      ttl,
      previousHash
    );

    this.registry.set(id, {
      id,
      serializedRequest: binaryPayload,
      timestamp,
      ttl,
      expiryTimer,
      previousHash,
      hash,
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

  public async dequeue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string
  ): Promise<void> {
    const item = this.registry.get(id);
    if (!item) return;

    clearTimeout(item.expiryTimer);
    zeroizeBlock(item);

    this.registry.delete(id);
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);

    await this.rechainLedger(cryptoProvider);
  }

  public async activeZeroization(
    cryptoProvider: ISovereignCryptoProvider,
    id: string
  ): Promise<void> {
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
  }

  public async verifyLedgerIntegrity(
    cryptoProvider: ISovereignCryptoProvider
  ): Promise<boolean> {
    let expectedPrevHash = genesisVector();

    for (const id of this.fifoOrder) {
      const block = this.registry.get(id);
      if (!block) return false;

      if (!constantTimeEqual(block.previousHash, expectedPrevHash)) {
        return false;
      }

      if (!block.isZeroized) {
        const recomputedHash = await computeBlockHash(
          cryptoProvider,
          block.id,
          block.serializedRequest,
          block.timestamp,
          block.ttl,
          block.previousHash
        );
        if (!constantTimeEqual(block.hash, recomputedHash)) {
          return false;
        }
      }

      expectedPrevHash = new Uint8Array(block.hash);
    }

    return true;
  }

  private resolvePreviousHash(): Uint8Array {
    if (this.fifoOrder.length === 0) return genesisVector();

    const tailId = this.fifoOrder[this.fifoOrder.length - 1];
    if (tailId === undefined) return genesisVector();

    const tailBlock = this.registry.get(tailId);
    return tailBlock ? new Uint8Array(tailBlock.hash) : genesisVector();
  }

  private async rechainLedger(
    cryptoProvider: ISovereignCryptoProvider
  ): Promise<void> {
    let runningPrevHash = genesisVector();

    for (const id of this.fifoOrder) {
      const block = this.registry.get(id);
      if (!block) continue;

      block.previousHash = new Uint8Array(runningPrevHash);
      block.hash = await computeBlockHash(
        cryptoProvider,
        block.id,
        block.serializedRequest,
        block.timestamp,
        block.ttl,
        block.previousHash
      );

      runningPrevHash = new Uint8Array(block.hash);
    }
  }
}
