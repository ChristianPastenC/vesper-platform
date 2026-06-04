// ISovereignCryptoProvider and IDPoPCryptoProvider are defined in contracts.ts
// (zero-dependency layer) and re-exported here for the DPoP subpath consumers.
export type { ISovereignCryptoProvider, IDPoPCryptoProvider } from '../contracts/index.js';

// ---------------------------------------------------------------------------
// Algorithm identifiers
// ---------------------------------------------------------------------------

/**
 * Asymmetric signature algorithms supported for DPoP proof generation.
 *
 * RFC 9449 §4.2 requires an asymmetric digital signature algorithm registered
 * in the IANA "JSON Web Signature and Encryption Algorithms" registry.
 *
 *  • ES256 — ECDSA using P-256 and SHA-256.
 *             Recommended: compact key/signature size, wide platform support
 *             across all SubtleCrypto implementations (browser, RN, Node 15+).
 *  • PS256 — RSASSA-PSS using SHA-256 and MGF1 with SHA-256.
 *             Suitable when ECDSA is unavailable or RSA keys are mandated by
 *             an enterprise PKI policy.
 */
export type DPoPAlgorithm = 'ES256' | 'PS256';

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

/**
 * An asymmetric key pair generated and held exclusively in volatile memory.
 * The private key MUST never be serialised or transmitted outside the
 * application runtime boundary.
 */
export interface DPoPKeyPair {
  /**
   * Public key exported in JSON Web Key format (RFC 7517).
   * Included verbatim in the `jwk` header of every DPoP proof JWT so the
   * verifier can validate the signature without a prior key-exchange step.
   *
   * Private key material (fields `d`, `p`, `q`, `dp`, `dq`, `qi`) is
   * stripped before this value is stored.
   */
  publicKeyJwk: JsonWebKey;

  /**
   * Opaque SubtleCrypto handle for the private signing key.
   * Obtained from SubtleCrypto.generateKey() and used exclusively inside
   * SubtleCrypto.sign() — never passed to exportKey() or any serialisation
   * pathway.
   */
  privateKey: CryptoKey;

  /** Algorithm with which this key pair was generated. */
  algorithm: DPoPAlgorithm;
}

/**
 * Options accepted by DPoPSigner.create() / generateDPoPKeyPair().
 */
export interface DPoPKeyConfig {
  /**
   * Asymmetric signature algorithm for proof generation.
   * @default 'ES256'
   */
  algorithm?: DPoPAlgorithm;
}

// ---------------------------------------------------------------------------
// Proof generation
// ---------------------------------------------------------------------------

/**
 * Per-request options for DPoP proof generation.
 */
export interface DPoPProofOptions {
  /**
   * HTTP method of the target request (case-insensitive; normalised to
   * uppercase internally per RFC 9449 §4.2).
   * Examples: 'GET', 'POST', 'PUT', 'DELETE'
   */
  method: string;

  /**
   * Full HTTP URI of the target resource.
   * Query-string and fragment components are stripped before inclusion in
   * the `htu` claim, per RFC 9449 §4.2.
   */
  url: string;

  /**
   * Raw access token string.
   * When present the library computes SHA-256(ASCII(token)) and includes the
   * base64url-encoded digest as the `ath` claim, binding this proof to the
   * specific token and preventing token/proof substitution attacks (RFC 9449 §4.2).
   */
  accessToken?: string;

  /**
   * Server-supplied nonce value.
   * When the authorization server or resource server returns a `DPoP-Nonce`
   * response header (typically alongside a 401 use_dpop_nonce error), pass
   * it here to include the `nonce` claim and satisfy the replay-prevention
   * requirement (RFC 9449 §8).
   *
   * NOTE: If errorTrapping.freezeOn401 is enabled on SovereignClientCore,
   * a 401/use_dpop_nonce response will freeze the session rather than
   * immediately retrying with the nonce. Disable freezeOn401 or handle
   * nonce-retry outside of the SovereignCore queue when using server nonces.
   */
  nonce?: string;
}

/**
 * Decoded structure of a DPoP proof JWT header (RFC 9449 §4.2).
 * Serialised as the first segment of the compact JWT representation.
 */
export interface DPoPProofHeader {
  /** Token type — MUST be the literal string "dpop+jwt". */
  typ: 'dpop+jwt';
  /** JWS algorithm identifier matching the signing key. */
  alg: DPoPAlgorithm;
  /** Public key that can be used to verify this proof's signature. */
  jwk: JsonWebKey;
}

// IDPoPCryptoProvider re-exported above from contracts.ts.

// ---------------------------------------------------------------------------
// Dynamic context types
// ---------------------------------------------------------------------------

/**
 * Dynamic token context resolved on every executor invocation.
 */
export interface DPoPTokenContext {
  /**
   * Current bearer / DPoP-bound access token string.
   */
  accessToken?: string;

  /**
   * Server-supplied nonce for replay prevention (RFC 9449 §8).
   */
  nonce?: string;
}

/**
 * Zero-argument resolver function that returns the current DPoP token context.
 */
export type DPoPContextResolver =
  | (() => DPoPTokenContext)
  | (() => Promise<DPoPTokenContext>);
