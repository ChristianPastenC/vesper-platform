import { sha256Sync } from './crypto.js';

export interface LedgerBlockInternal {
  id: string;
  serializedRequest: Uint8Array;
  timestamp: number;
  ttl: number;
  previousHash: Uint8Array;
  currentHash: Uint8Array;
  isZeroized: boolean;
}

// Memory queue fallback implementation when running outside React Native (Node.js/Jest/SSR)
export class SovereignSecureClientFallback {
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

    this.queue.push({
      id,
      serializedRequest: payload,
      timestamp,
      ttl,
      previousHash: prevHash,
      currentHash,
      isZeroized: false,
    });
    this.idToIndex.set(id, this.queue.length - 1);
    return false;
  }

  public getQueueStatus() {
    return {
      size: this.queue.length,
      isLocked: this.isLocked,
      isIntegrityCompromised: this.isIntegrityCompromised,
    };
  }

  public toggleNetworkSim(online: boolean): void {
    this.isOnline = online;
  }

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
        this.isLocked = true;
        this.isIntegrityCompromised = true;
        return false;
      }
      if (!block.isZeroized) {
        const recomputed = this.computeBlockHash(
          block.serializedRequest,
          block.previousHash,
          block.timestamp,
        );
        if (!this.constantTimeEqual(block.currentHash, recomputed)) {
          this.isLocked = true;
          this.isIntegrityCompromised = true;
          return false;
        }
      }
      expectedPrevHash = new Uint8Array(block.currentHash);
    }
    return true;
  }

  public clearQueue(): void {
    for (const block of this.queue) this.zeroizeBlock(block);
    this.queue = [];
    this.idToIndex.clear();
    this.isLocked = false;
  }

  public zeroize(id: string): void {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    const block = this.queue[idx];
    if (block) this.zeroizeBlock(block);
    this.queue.splice(idx, 1);
    this.rechainLedger();
  }

  public getQueueIds(): string[] {
    return this.queue.map((b) => b.id);
  }

  public getTransactionPayload(id: string): ArrayBuffer | null {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return null;
    const block = this.queue[idx];
    if (!block || block.isZeroized) return null;
    return block.serializedRequest.buffer.slice(
      block.serializedRequest.byteOffset,
      block.serializedRequest.byteOffset + block.serializedRequest.byteLength,
    ) as ArrayBuffer;
  }

  public getTelemetrySnapshot(): ArrayBuffer {
    // This JS-only fallback has no native telemetry engine to drain, so it
    // always reports an empty snapshot (matches queue.ts's payload.length > 0 check).
    return new ArrayBuffer(0);
  }

  public base64UrlEncode(data: ArrayBuffer): string {
    const bytes = new Uint8Array(data);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]!);
    }
    return typeof btoa !== 'undefined'
      ? btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      : Buffer.from(bytes).toString('base64url');
  }

  private zeroizeBlock(block: LedgerBlockInternal): void {
    block.serializedRequest.fill(0);
    block.previousHash.fill(0);
    block.currentHash.fill(0);
    block.isZeroized = true;
  }

  private computeBlockHash(
    serializedRequest: Uint8Array,
    previousHash: Uint8Array,
    timestamp: number,
  ): Uint8Array {
    const tsBytes = new TextEncoder().encode(timestamp.toString());
    const preImage = new Uint8Array(
      serializedRequest.length + previousHash.length + tsBytes.length,
    );
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
      if (!block.isZeroized)
        block.currentHash = this.computeBlockHash(
          block.serializedRequest,
          block.previousHash,
          block.timestamp,
        );
      runningPrevHash = new Uint8Array(block.currentHash);
      this.idToIndex.set(block.id, i);
    }
  }
}

