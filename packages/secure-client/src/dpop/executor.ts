import type { DPoPProofOptions } from './types.js';
import type { DPoPSigner } from './signer.js';

// ---------------------------------------------------------------------------
// Dynamic context types
// ---------------------------------------------------------------------------

/**
 * Dynamic token context resolved on every executor invocation.
 *
 * Separating dynamic fields (access token, nonce) from static fields
 * (method, URL) ensures that when SovereignClientCore drains the queue after
 * a connectivity gap, the proof is generated with the current token — not the
 * stale one that was in scope when the request was originally enqueued.
 */
export interface DPoPTokenContext {
  /**
   * Current bearer / DPoP-bound access token string.
   *
   * Re-read at execution time via the contextResolver so queue-drain retries
   * always use the latest token, even if the original token expired during the
   * outage window.
   *
   * When provided, the library computes SHA-256(ASCII(token)) and includes
   * the base64url digest as the `ath` claim (RFC 9449 §4.2), binding the
   * proof to this specific token.
   */
  accessToken?: string;

  /**
   * Server-supplied nonce for replay prevention (RFC 9449 §8).
   *
   * Inject this when the resource server returns a `DPoP-Nonce` header.
   * If the nonce changes between a failed attempt and a queue-drain retry,
   * update it via a fresh contextResolver invocation.
   */
  nonce?: string;
}

/**
 * Zero-argument resolver function that returns the current DPoP token context.
 * Called once per executor invocation — both on live requests and on queue
 * drain retries — guaranteeing proof freshness without any stale-closure risk.
 *
 * May be synchronous or async (e.g. for token-refresh flows).
 */
export type DPoPContextResolver =
  | (() => DPoPTokenContext)
  | (() => Promise<DPoPTokenContext>);

// ---------------------------------------------------------------------------
// withDPoP — transport-agnostic DPoP executor wrapper
// ---------------------------------------------------------------------------

/**
 * withDPoP
 *
 * Wraps any transport executor in a function that lazily generates a fresh
 * DPoP proof on every invocation, making it safe to use with
 * SovereignClientCore.execute() — including when the request is queued and
 * retried after a connectivity gap.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  WHY PROOF FRESHNESS MATTERS                                           │
 * │                                                                        │
 * │  DPoP proofs are single-use and time-bounded (servers typically reject │
 * │  proofs with iat older than 60 s).  If you generate a proof BEFORE     │
 * │  calling execute(), the proof stored inside the executor closure will  │
 * │  be stale by the time SovereignClientCore drains the queue.            │
 * │                                                                        │
 * │  withDPoP() enforces freshness by construction: the proof is generated │
 * │  lazily inside the wrapper, immediately before the transport call.     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * @param signer          DPoPSigner instance holding the session key pair.
 * @param method          HTTP method for the target request ('GET', 'POST', …).
 * @param url             Full URI of the target resource (query/fragment stripped internally).
 * @param contextResolver Zero-argument function returning the current access
 *                        token and optional nonce. Called on EVERY invocation,
 *                        including queue-drain retries.
 * @param executor        Transport function that receives the generated DPoP
 *                        proof string and performs the actual HTTP call.
 *                        Compatible with fetch, Axios, Apollo, any adapter.
 *
 * @returns A zero-argument async function compatible with
 *          SovereignClientCore.execute()'s executor parameter.
 *
 * ---
 *
 * @example Fetch API
 * ```ts
 * import { withDPoP, SovereignHttpError } from '@sovereign/secure-client';
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: authStore.getToken() }),
 *   async (proof) => {
 *     const res = await fetch('https://api.example.com/transfer', {
 *       method: 'POST',
 *       headers: {
 *         'Authorization': `DPoP ${authStore.getToken()}`,
 *         'DPoP': proof,
 *         'Content-Type': 'application/json',
 *       },
 *       body: JSON.stringify(payload),
 *     });
 *     // fetch() does NOT throw on non-2xx — throw manually so the Error
 *     // Trapping Matrix can intercept 503/504 and freeze the session.
 *     if (!res.ok) throw new SovereignHttpError(res.status);
 *     return res.json() as Promise<TransferResult>;
 *   },
 * );
 * await core.execute('transfer-42', executor, { type: 'transfer', amount: 100 });
 * ```
 *
 * @example Axios
 * ```ts
 * import { withDPoP } from '@sovereign/secure-client';
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: authStore.getToken() }),
 *   (proof) => axios.post<TransferResult>(
 *     'https://api.example.com/transfer', payload,
 *     { headers: { 'Authorization': `DPoP ${authStore.getToken()}`, 'DPoP': proof } },
 *   ),
 *   // Axios automatically throws on non-2xx — SovereignCore intercepts 503/504.
 * );
 * await core.execute('transfer-42', executor, { type: 'transfer', amount: 100 });
 * ```
 *
 * @example Apollo GraphQL
 * ```ts
 * import { withDPoP } from '@sovereign/secure-client';
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/graphql',
 *   () => ({ accessToken: authStore.getToken() }),
 *   async (proof) => {
 *     const { data, errors } = await apolloClient.mutate({
 *       mutation: TRANSFER_MUTATION,
 *       variables: payload,
 *       context: {
 *         headers: {
 *           'Authorization': `DPoP ${authStore.getToken()}`,
 *           'DPoP': proof,
 *         },
 *       },
 *     });
 *     if (errors?.length) throw new Error(errors[0]?.message ?? 'GraphQL error');
 *     return data as TransferResult;
 *   },
 * );
 * await core.execute('transfer-42', executor, { type: 'transfer', amount: 100 });
 * ```
 *
 * @example React Native with dynamic nonce (use_dpop_nonce flow)
 * ```ts
 * import { withDPoP } from '@sovereign/secure-client';
 *
 * let currentNonce: string | undefined;
 *
 * const executor = withDPoP(
 *   signer, 'POST', 'https://api.example.com/transfer',
 *   () => ({ accessToken: authStore.getToken(), nonce: currentNonce }),
 *   async (proof) => {
 *     const res = await fetch('https://api.example.com/transfer', {
 *       method: 'POST',
 *       headers: { 'Authorization': `DPoP ${authStore.getToken()}`, 'DPoP': proof },
 *       body: JSON.stringify(payload),
 *     });
 *     if (res.status === 401) {
 *       // Server may require a nonce on the next attempt.
 *       currentNonce = res.headers.get('DPoP-Nonce') ?? undefined;
 *       throw new SovereignHttpError(401);
 *     }
 *     if (!res.ok) throw new SovereignHttpError(res.status);
 *     return res.json() as Promise<TransferResult>;
 *   },
 * );
 * ```
 */
export function withDPoP<T>(
  signer: DPoPSigner,
  method: string,
  url: string,
  contextResolver: DPoPContextResolver,
  executor: (dpopProof: string) => Promise<T>
): () => Promise<T> {
  return async (): Promise<T> => {
    // Resolve dynamic context (access token + optional nonce) at call time,
    // NOT at the time withDPoP() was called.
    const context = await contextResolver();

    // Build proof options — only include optional fields when they carry a value
    // (required by exactOptionalPropertyTypes strict-mode enforcement).
    const proofOptions: DPoPProofOptions = { method, url };
    if (context.accessToken !== undefined) proofOptions.accessToken = context.accessToken;
    if (context.nonce !== undefined)       proofOptions.nonce       = context.nonce;

    // Generate a fresh proof on every invocation (never reuse across requests).
    const dpopProof = await signer.generateProof(proofOptions);

    return executor(dpopProof);
  };
}
