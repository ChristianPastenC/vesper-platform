import type { ISovereignCryptoProvider } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers — not exported from the package barrel
// ---------------------------------------------------------------------------

/**
 * Concatenates an ordered set of Uint8Array segments into a single flat buffer.
 * Used to assemble the pre-image that is fed into SHA-256 for block hashing.
 *
 * Layout: serializedRequest || previousHash || timestamp
 */
function concatSegments(segments: Uint8Array[]): Uint8Array {
  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const segment of segments) {
    output.set(segment, offset);
    offset += segment.length;
  }
  return output;
}

// ---------------------------------------------------------------------------
// Public crypto utilities consumed by the ledger
// ---------------------------------------------------------------------------

/**
 * Computes the SHA-256 block hash for a ledger entry.
 *
 * The pre-image is a deterministic concatenation of all block fields that must
 * remain immutable after enqueue:
 *   SHA256( serializedRequest || previousHash || timestamp(utf8) )
 *
 * Including previousHash in the pre-image is what creates the chain linkage:
 * any mutation to a block's contents or to the ordering of blocks will
 * invalidate every descendant hash, making tampering detectable.
 */
export async function computeBlockHash(
  cryptoProvider: ISovereignCryptoProvider,
  serializedRequest: Uint8Array,
  previousHash: Uint8Array,
  timestamp: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();

  const preImage = concatSegments([
    serializedRequest,
    previousHash,
    encoder.encode(timestamp.toString())
  ]);

  return new Uint8Array(await cryptoProvider.sha256(preImage));
}

/**
 * Constant-time equality check for two Uint8Array buffers.
 *
 * Iterates the full length of both arrays regardless of where a mismatch is
 * found, preventing timing side-channels that could leak information about
 * partial hash matches.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    // Non-null assertions are safe: `i` is bounded by `a.length` above.
    diff |= (a[i] as number) ^ (b[i] as number);
  }
  return diff === 0;
}

/**
 * Allocates a 32-byte zero-filled Uint8Array used as the genesis previousHash
 * (initialization vector) for the first block in a fresh ledger.
 */
export function genesisVector(): Uint8Array {
  return new Uint8Array(32);
}
