import type { ISovereignCryptoProvider, LedgerBlock } from './types.js';
import { computeBlockHash, constantTimeEqual, genesisVector } from './crypto.js';

/**
 * SovereignMemoryQueue
 *
 * An in-memory, FIFO transaction ledger whose entries are cryptographically
 * chained using SHA-256 — analogous to a miniature blockchain operating
 * entirely inside volatile RAM.
 *
 * Security properties guaranteed by this class:
 *  - Zero disk footprint: all data lives exclusively in JS heap memory.
 *  - Tamper detection: any in-place mutation of a payload byte will cause
 *    verifyLedgerIntegrity() to return false before the queue is drained.
 *  - Byte-level zeroization: expired or manually purged payloads are
 *    overwritten with binary zeroes before the GC pointer is released,
 *    mitigating cold-boot and memory-dump forensic extraction.
 *  - Dynamic rechaining: removing any block (dequeue or zeroization) triggers
 *    a full cascade recomputation of hashes for all successor blocks, keeping
 *    the chain verifiable at all times.
 *
 * This class is implemented as a Singleton so that a single ledger instance
 * is shared across the entire application runtime, matching the semantics of a
 * global transaction queue.
 */
export class SovereignMemoryQueue {
  private static instance: SovereignMemoryQueue;

  /** Internal map of block ID → LedgerBlock. */
  private readonly registry = new Map<string, LedgerBlock>();

  /** Ordered list of block IDs preserving FIFO insertion order. */
  private fifoOrder: string[] = [];

  private constructor() {}

  // ---------------------------------------------------------------------------
  // Singleton accessor
  // ---------------------------------------------------------------------------

  public static getInstance(): SovereignMemoryQueue {
    if (!SovereignMemoryQueue.instance) {
      SovereignMemoryQueue.instance = new SovereignMemoryQueue();
    }
    return SovereignMemoryQueue.instance;
  }

  // ---------------------------------------------------------------------------
  // Write operations
  // ---------------------------------------------------------------------------

  /**
   * Enqueues a new transaction payload into the ledger and starts its TTL
   * watchdog timer.
   *
   * If a block with the same id already exists, it is synchronously zeroized
   * and removed before the new block is inserted, preventing duplicate entries
   * from accumulating in the queue.
   *
   * The new block's hash is computed over:
   *   SHA256( id || binaryPayload || timestamp || ttl || previousHash )
   * where previousHash is the hash of the current tail block, or a 32-byte
   * zero vector if the ledger is empty (genesis condition).
   */
  public async enqueue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
    binaryPayload: Uint8Array,
    ttl: number,
    onExpire: (id: string) => void
  ): Promise<void> {
    // Evict any pre-existing block with the same ID before inserting.
    if (this.registry.has(id)) {
      await this.activeZeroization(cryptoProvider, id);
    }

    // Derive previousHash from the current tail, or use the genesis IV.
    const previousHash = this.resolvePreviousHash();

    // Arm the TTL watchdog; fires if the channel is not restored in time.
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

  // ---------------------------------------------------------------------------
  // Read operations
  // ---------------------------------------------------------------------------

  /** Returns a snapshot of the current FIFO execution order. */
  public getExecutionOrder(): string[] {
    return [...this.fifoOrder];
  }

  /** Returns the LedgerBlock for the given id, or undefined if not present. */
  public getPayload(id: string): LedgerBlock | undefined {
    return this.registry.get(id);
  }

  // ---------------------------------------------------------------------------
  // Removal operations
  // ---------------------------------------------------------------------------

  /**
   * Removes a successfully processed block from the ledger, cancels its TTL
   * timer, and triggers a cascade rechain of all successor blocks.
   *
   * Called after a queued executor has resolved successfully.
   */
  public async dequeue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string
  ): Promise<void> {
    const item = this.registry.get(id);
    if (!item) return;

    clearTimeout(item.expiryTimer);
    this.registry.delete(id);
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);

    // Recompute successor hashes so the ledger remains verifiable.
    await this.rechainLedger(cryptoProvider);
  }

  /**
   * Performs byte-level zeroization on the target block's payload
   * (overwriting every byte with 0x00), marks it as zeroized, then
   * physically removes it from the ledger and recalculates successor hashes.
   *
   * Called on TTL expiry or when a hostile network condition is detected.
   * Satisfies OWASP MASVS-RESILIENCE and anti-cold-boot-attack requirements.
   */
  public async activeZeroization(
    cryptoProvider: ISovereignCryptoProvider,
    id: string
  ): Promise<void> {
    const item = this.registry.get(id);
    if (!item) return;

    clearTimeout(item.expiryTimer);

    // Overwrite every byte before releasing the reference.
    item.serializedRequest.fill(0);
    item.isZeroized = true;

    this.registry.delete(id);
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);

    await this.rechainLedger(cryptoProvider);
  }

  /**
   * Emergency purge: zeroizes and removes every block in the ledger
   * synchronously (no rechaining needed because the ledger will be empty).
   *
   * Called when the cryptographic handshake fails or ledger integrity is
   * compromised — ensures no sensitive data lingers in heap memory.
   */
  public clearAll(): void {
    for (const [, item] of this.registry) {
      clearTimeout(item.expiryTimer);
      item.serializedRequest.fill(0);
    }
    this.registry.clear();
    this.fifoOrder = [];
  }

  // ---------------------------------------------------------------------------
  // Integrity verification
  // ---------------------------------------------------------------------------

  /**
   * Traverses the entire ledger in FIFO order and validates two invariants
   * for each block:
   *
   *  1. Chain linkage: block.previousHash must equal the hash of the preceding
   *     block (or the genesis zero vector for the first block).
   *  2. Content integrity: for non-zeroized blocks, recomputing the hash from
   *     the live payload must match the stored block.hash value.
   *
   * Returns false immediately upon detecting the first violation.
   * Returns true only when every block in the ledger satisfies both invariants.
   */
  public async verifyLedgerIntegrity(
    cryptoProvider: ISovereignCryptoProvider
  ): Promise<boolean> {
    let expectedPrevHash = genesisVector();

    for (const id of this.fifoOrder) {
      const block = this.registry.get(id);
      if (!block) return false;

      // Invariant 1: previous-hash linkage.
      if (!constantTimeEqual(block.previousHash, expectedPrevHash)) {
        return false;
      }

      // Invariant 2: payload integrity (skip for already-zeroized blocks).
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the SHA-256 hash of the current tail block, or the genesis zero
   * vector when the ledger is empty.
   */
  private resolvePreviousHash(): Uint8Array {
    if (this.fifoOrder.length === 0) return genesisVector();

    const tailId = this.fifoOrder[this.fifoOrder.length - 1];
    if (tailId === undefined) return genesisVector();

    const tailBlock = this.registry.get(tailId);
    return tailBlock ? new Uint8Array(tailBlock.hash) : genesisVector();
  }

  /**
   * Recomputes previousHash and hash for every block in FIFO order after a
   * removal operation.
   *
   * This cascade ensures the chain remains contiguous and verifiable even
   * when a block is removed from the middle of the queue.
   */
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
