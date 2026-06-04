import type { DPoPContextResolver } from './types.js';
import type { DPoPSigner } from './signer.js';
import type { PendingDPoPContext } from '../types.js';

// ---------------------------------------------------------------------------
// withDPoP — Context Builder for executeRequest
// ---------------------------------------------------------------------------

/**
 * withDPoP
 *
 * Builds a dynamic DPoP context for use with `SovereignClientCore.executeRequest()`.
 * 
 * By passing this context to `executeRequest`, the SovereignCore framework will
 * lazily generate a fresh DPoP proof on every invocation (both live requests
 * and offline queue-drain retries), safely injecting it into the binary payload
 * without ever capturing sensitive data in JS closures.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  WHY PROOF FRESHNESS MATTERS                                           │
 * │                                                                        │
 * │  DPoP proofs are single-use and time-bounded. If a proof is generated  │
 * │  when the request is enqueued offline, it will be rejected as stale by │
 * │  the server when the queue drains later.                               │
 * │                                                                        │
 * │  withDPoP() + executeRequest() enforces freshness by generating the    │
 * │  proof immediately before the binary payload is transmitted.           │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * @param signer          DPoPSigner instance holding the session key pair.
 * @param method          HTTP method for the target request ('GET', 'POST', …).
 * @param url             Full URI of the target resource.
 * @param contextResolver Zero-argument function returning the current access
 *                        token and optional nonce. Called on EVERY invocation.
 *
 * @returns A `PendingDPoPContext` to be passed to `executeRequest()`.
 *
 * ---
 *
 * @example Usage with FetchAdapter
 * ```ts
 * import { withDPoP, encodeJsonBody, encodeHeaders } from '@sovereign/secure-client';
 *
 * const request = {
 *   method: 'POST',
 *   url: 'https://api.example.com/transfer',
 *   encodedHeaders: encodeHeaders({ 'Content-Type': 'application/json' }),
 *   body: encodeJsonBody({ type: 'transfer', amount: 100 })
 * };
 * 
 * const dpopContext = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: authStore.getToken() })
 * );
 * 
 * await core.executeRequest('transfer-42', request, dpopContext);
 * ```
 */
export function withDPoP(
  signer: DPoPSigner,
  method: string,
  url: string,
  contextResolver: DPoPContextResolver
): PendingDPoPContext {
  return {
    signer,
    method,
    url,
    contextResolver
  };
}
