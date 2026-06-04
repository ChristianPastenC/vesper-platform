import type { LedgerBlock } from '../types.js';

/**
 * Zeroizes every Uint8Array field of a LedgerBlock in-place.
 *
 * Scope of erasure:
 *  • serializedRequest — the sensitive request metadata payload
 *  • previousHash      — 32-byte SHA-256 that chains this block
 *  • hash              — 32-byte SHA-256 of this block's content
 *
 * All three arrays are overwritten with 0x00 via .fill(0) before the GC
 * pointer is released, preventing cold-boot and heap-dump extraction.
 */
export function zeroizeBlock(block: LedgerBlock): void {
  block.serializedRequest.fill(0);
  block.previousHash.fill(0);
  block.hash.fill(0);
  block.isZeroized = true;
}
