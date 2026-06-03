import type { ISovereignCryptoProvider, LedgerBlock } from './types.js';
import { computeBlockHash, constantTimeEqual, genesisVector } from './crypto.js';

// ---------------------------------------------------------------------------
// Internal helper — bit-level full-block zeroization
// ---------------------------------------------------------------------------

/**
 * Zeroizes every Uint8Array field of a LedgerBlock in-place.
 *
 * Scope of erasure:
 *  • serializedRequest — the sensitive request metadata payload (primary target)
 *  • previousHash      — 32-byte SHA-256 that chains this block to its predecessor
 *  • hash              — 32-byte SHA-256 of this block's content
 *
 * All three arrays are overwritten with 0x00 via .fill(0) before the GC
 * pointer is released, preventing cold-boot and heap-dump extraction of:
 *  - the plaintext metadata
 *  - the hash fingerprints that could identify the payload without decryption
 *
 * The `id`, `timestamp`, `ttl`, and `expiryTimer` fields are scalar primitives;
 * they do not hold typed-array memory and are released by normal GC.
 */
function zeroizeBlock(block: LedgerBlock): void {
  block.serializedRequest.fill(0);
  block.previousHash.fill(0);
  block.hash.fill(0);
  block.isZeroized = true;
}

// ---------------------------------------------------------------------------
// SovereignMemoryQueue — Singleton
// ---------------------------------------------------------------------------

/**
 * SovereignMemoryQueue
 *
 * A global-singleton, in-memory FIFO transaction ledger whose entries are
 * cryptographically chained using SHA-256 — analogous to a miniature
 * append-only blockchain operating entirely inside volatile RAM.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SINGLETON CONTRACT
 * ═══════════════════════════════════════════════════════════════════════
 * Only one instance exists per JS runtime (one per browser tab / RN process /
 * Node.js process). All calls to SovereignMemoryQueue.getInstance() return the
 * SAME object. This is intentional: SovereignClientCore and any consumer code
 * must share a single queue so FIFO ordering and chain integrity are maintained
 * across multiple SovereignClientCore usages within the same application.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * TYPED-ARRAY / BIT-LEVEL ZEROIZATION MODEL
 * ═══════════════════════════════════════════════════════════════════════
 * Every byte that enters the ledger travels exclusively through Uint8Array
 * buffers. No string copies of sensitive data are held inside the queue after
 * enqueue time (the JSON string is ephemeral in the TextEncoder call inside
 * SovereignClientCore.enqueueForRetry()).
 *
 * Zeroization scope per eviction (TTL expiry, manual dequeue, or purge):
 *  • serializedRequest  — the sensitive payload bytes (primary sensitive data)
 *  • previousHash       — 32-byte SHA-256 chain pointer (hash fingerprint)
 *  • hash               — 32-byte SHA-256 of this block (hash fingerprint)
 *
 * All three arrays are overwritten via Uint8Array.fill(0) BEFORE the Map
 * entry is deleted and the GC pointer released. This implements the
 * OWASP MASVS-RESILIENCE memory-erasure control and mitigates cold-boot
 * and heap-snapshot forensic attacks.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CRYPTOGRAPHIC CHAIN MODEL
 * ═══════════════════════════════════════════════════════════════════════
 *  - Zero disk footprint: all data lives exclusively in JS heap memory.
 *  - Tamper detection: any in-place mutation of a payload byte will cause
 *    verifyLedgerIntegrity() to return false before the queue is drained.
 *  - Dynamic rechaining: removing any block triggers a full cascade
 *    recomputation of hashes for all successor blocks.
 */
export class SovereignMemoryQueue {
  private static instance: SovereignMemoryQueue;

  /** Internal map of block ID → LedgerBlock. */
  private readonly registry = new Map<string, LedgerBlock>();

  /** Ordered list of block IDs preserving FIFO insertion order. */
  private fifoOrder: string[] = [];

  /** Private constructor — use SovereignMemoryQueue.getInstance(). */
  private constructor() { }

  // ---------------------------------------------------------------------------
  // Singleton accessor
  // ---------------------------------------------------------------------------

  /**
   * Returns the process-wide singleton instance, creating it on first call.
   *
   * Thread safety: JavaScript is single-threaded so no mutex is needed.
   * The lazy-initialisation pattern is safe in all JS runtimes.
   */
  public static getInstance(): SovereignMemoryQueue {
    if (!SovereignMemoryQueue.instance) {
      SovereignMemoryQueue.instance = new SovereignMemoryQueue();
    }
    return SovereignMemoryQueue.instance;
  }

  // ---------------------------------------------------------------------------
  // Introspection
  // ---------------------------------------------------------------------------

  /** Returns the number of blocks currently held in the ledger. */
  public get size(): number {
    return this.registry.size;
  }

  // ---------------------------------------------------------------------------
  // Write operations
  // ---------------------------------------------------------------------------

  /**
   * Enqueues a new transaction payload into the ledger and arms its TTL watchdog.
   *
   * If a block with the same id already exists, it is fully zeroized and removed
   * before the new block is inserted, preventing duplicate entries from
   * accumulating in the queue.
   *
   * Block hash pre-image (deterministic concatenation):
   *   SHA256( id‖binaryPayload‖timestamp‖ttl‖previousHash )
   * where previousHash is the hash of the current tail block, or a 32-byte
   * zero genesis vector when the ledger is empty.
   *
   * @param cryptoProvider  SHA-256 + CSPRNG provider.
   * @param id              Unique request identifier.
   * @param binaryPayload   Uint8Array of serialized request metadata.
   *                        The caller must NOT mutate this buffer after passing
   *                        it here; the ledger holds a direct reference, not a copy.
   * @param ttl             Time-to-live in milliseconds.
   * @param onExpire        Callback fired on TTL expiry (before zeroization).
   */
  public async enqueue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string,
    binaryPayload: Uint8Array,
    ttl: number,
    onExpire: (id: string) => void
  ): Promise<void> {
    // Evict any pre-existing block with the same ID (full zeroization).
    if (this.registry.has(id)) {
      await this.activeZeroization(cryptoProvider, id);
    }

    // Snapshot the tail hash before we push so there is no TOCTOU gap.
    const previousHash = this.resolvePreviousHash();

    // Arm the TTL watchdog — fires if connectivity is not restored in time.
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

  /** Returns a snapshot of the current FIFO execution order (defensive copy). */
  public getExecutionOrder(): string[] {
    return [...this.fifoOrder];
  }

  /**
   * Returns the LedgerBlock for the given id, or undefined if absent.
   * Callers MUST NOT mutate the returned block directly.
   */
  public getPayload(id: string): LedgerBlock | undefined {
    return this.registry.get(id);
  }

  // ---------------------------------------------------------------------------
  // Removal operations
  // ---------------------------------------------------------------------------

  /**
   * Removes a successfully processed block from the ledger, cancels its TTL
   * timer, zeroizes ALL typed arrays on the block, and triggers a cascade
   * rechain of all successor blocks.
   *
   * Zeroized arrays: serializedRequest (payload) + previousHash + hash.
   * Called after a queued executor has resolved successfully.
   */
  public async dequeue(
    cryptoProvider: ISovereignCryptoProvider,
    id: string
  ): Promise<void> {
    const item = this.registry.get(id);
    if (!item) return;

    clearTimeout(item.expiryTimer);

    // Zeroize ALL Uint8Array fields before releasing the registry reference.
    zeroizeBlock(item);

    this.registry.delete(id);
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);

    // Recompute successor hashes so the chain remains verifiable.
    await this.rechainLedger(cryptoProvider);
  }

  /**
   * Performs bit-level zeroization of the target block's ALL typed arrays
   * (serializedRequest, previousHash, hash via the shared zeroizeBlock helper),
   * marks it as zeroized, then physically removes it from the ledger and
   * recalculates successor hashes.
   *
   * Called on TTL expiry or when a hostile network condition is detected.
   *
   * Satisfies:
   *  - OWASP MASVS-RESILIENCE: memory-erasure control
   *  - Anti-cold-boot-attack: 0x00 overwrite before pointer release
   *  - Anti-heap-dump: hash fingerprints erased alongside payload
   */
  public async activeZeroization(
    cryptoProvider: ISovereignCryptoProvider,
    id: string
  ): Promise<void> {
    const item = this.registry.get(id);
    if (!item) return;

    clearTimeout(item.expiryTimer);

    // Overwrite serializedRequest + previousHash + hash before dereferencing.
    zeroizeBlock(item);

    this.registry.delete(id);
    this.fifoOrder = this.fifoOrder.filter(orderId => orderId !== id);

    await this.rechainLedger(cryptoProvider);
  }

  /**
   * Emergency purge: zeroizes ALL typed arrays on every block and clears the
   * ledger synchronously (no rechaining needed — the ledger will be empty).
   *
   * Zeroized per block: serializedRequest + previousHash + hash.
   *
   * Called when:
   *  - The cryptographic handshake fails (hostile network detected).
   *  - Ledger integrity verification fails (tampering detected).
   *  - The consumer explicitly forces a session reset.
   */
  public clearAll(): void {
    for (const [, item] of this.registry) {
      clearTimeout(item.expiryTimer);
      zeroizeBlock(item);
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
   * Comparison is performed via constantTimeEqual() to prevent timing
   * side-channel attacks that could leak partial hash information.
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

      // Invariant 1: previous-hash chain linkage.
      if (!constantTimeEqual(block.previousHash, expectedPrevHash)) {
        return false;
      }

      // Invariant 2: payload content integrity (skip for already-zeroized blocks).
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
   * Returns a defensive copy of the SHA-256 hash of the current tail block,
   * or the 32-byte genesis zero vector when the ledger is empty.
   *
   * A copy is taken (new Uint8Array(tailBlock.hash)) so that any future
   * zeroization of the tail block does not corrupt the previousHash reference
   * stored on the newly-enqueued block.
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
   * when a block is removed from the middle of the queue.  Each block's
   * previousHash and hash fields are overwritten with freshly allocated
   * Uint8Array instances — the old buffers are released to the GC.
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
