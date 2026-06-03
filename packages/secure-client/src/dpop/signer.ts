import type {
  DPoPAlgorithm,
  DPoPKeyConfig,
  DPoPKeyPair,
  DPoPProofHeader,
  DPoPProofOptions,
  IDPoPCryptoProvider,
} from './types.js';
import { generateDPoPKeyPair } from './keys.js';

// ---------------------------------------------------------------------------
// Internal JWT payload shape
// ---------------------------------------------------------------------------

/** RFC 9449 §4.2 DPoP proof JWT payload claims. */
interface DPoPProofPayload {
  /** Unique token ID — prevents proof replay. */
  jti: string;
  /** HTTP method, uppercased. */
  htm: string;
  /** Target URI, stripped of query and fragment. */
  htu: string;
  /** Issued-at timestamp (seconds since Unix epoch). */
  iat: number;
  /** SHA-256 hash of the bound access token (base64url), when provided. */
  ath?: string;
  /** Server-supplied nonce, when provided. */
  nonce?: string;
}

// ---------------------------------------------------------------------------
// Base64url encoding utilities
// ---------------------------------------------------------------------------

/**
 * Encodes a raw byte array as a base64url string (RFC 4648 §5, no padding).
 *
 * Uses a pure-JS lookup-table implementation that is compatible with every
 * supported runtime without requiring a global polyfill:
 *   • Browsers (all versions)
 *   • React Native (Hermes / JavaScriptCore, any SDK version)
 *   • Node.js (any LTS version, including Node 14 which lacks global `btoa`)
 *   • Angular Universal / NestJS SSR targets
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = bytes[i + 1] as number ?? 0;
    const b2 = bytes[i + 2] as number ?? 0;

    result += CHARS[b0 >> 2];
    result += CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < len) result += CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (i + 2 < len) result += CHARS[b2 & 0x3f];
  }

  return result;
}

/**
 * Serialises an object to JSON, encodes the UTF-8 bytes as base64url, and
 * returns the result. Used for JWT header and payload segments.
 */
function base64UrlEncodeJson(obj: object): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
}

// ---------------------------------------------------------------------------
// URL normalisation
// ---------------------------------------------------------------------------

/**
 * Strips query-string and fragment components from a URL, returning only the
 * scheme + authority + path as required by RFC 9449 §4.2 for the `htu` claim.
 *
 * Implementation strategy:
 *  1. Tries the WHATWG URL constructor (browsers, RN ≥ 0.63 / Expo SDK ≥ 42,
 *     Node.js ≥ 10) — zero-overhead when available.
 *  2. Falls back to manual string parsing when the URL global is absent (older
 *     React Native SDKs without `react-native-url-polyfill`).
 *
 * The fallback parser handles the most common absolute URL form:
 *   scheme://host[:port]/path[?query][#fragment]
 * Relative URLs are returned unchanged; they are invalid as DPoP `htu` values
 * regardless and will cause server-side validation to fail explicitly.
 */
function normalizeHtu(url: string): string {
  // Primary: WHATWG URL constructor — covers browsers, modern RN, and Node.
  if (typeof URL !== 'undefined') {
    try {
      const { protocol, host, pathname } = new URL(url);
      return `${protocol}//${host}${pathname}`;
    } catch {
      // Fall through to manual parser.
    }
  }

  // Fallback: manual parser for environments without the URL global.
  // Strips '?' query and '#' fragment from the raw string.
  const withoutFragment = url.split('#')[0] ?? url;
  const withoutQuery = withoutFragment.split('?')[0] ?? withoutFragment;
  return withoutQuery;
}

// ---------------------------------------------------------------------------
// SubtleCrypto signing algorithm parameter builders
// ---------------------------------------------------------------------------

/**
 * Returns the SubtleCrypto signing algorithm parameters matching the key pair
 * algorithm, used as the first argument to SubtleCrypto.sign().
 *
 *  • ES256 → ECDSA with SHA-256 (IEEE P1363 signature format, required by JWS)
 *  • PS256 → RSA-PSS with SHA-256, salt length 32 bytes (= hash output length)
 */
function buildSigningParams(
  algorithm: DPoPAlgorithm
): EcdsaParams | RsaPssParams {
  switch (algorithm) {
    case 'ES256': return { name: 'ECDSA', hash: 'SHA-256' };
    case 'PS256': return { name: 'RSA-PSS', saltLength: 32 };
  }
}

// ---------------------------------------------------------------------------
// DPoPSigner
// ---------------------------------------------------------------------------

/**
 * DPoPSigner
 *
 * Generates RFC 9449-compliant Demonstrating Proof-of-Possession (DPoP) proof
 * JWTs and signs them asymmetrically using the SubtleCrypto API.
 *
 * DPoP overview:
 *  DPoP is an OAuth 2.0 extension that binds access tokens to a specific client
 *  key pair.  For each protected request the client produces a short-lived,
 *  single-use JWT (the "DPoP proof") signed with its private key.  The server
 *  verifies both the proof signature (using the public key embedded in the JWT
 *  header) and that the proof was freshly minted for this specific request
 *  method/URI/token combination, preventing token theft and replay attacks.
 *
 * Proof JWT structure (RFC 9449 §4.2):
 *
 *   Header  { typ: "dpop+jwt", alg: "ES256"|"PS256", jwk: <public-key-JWK> }
 *   Payload { jti, htm, htu, iat, [ath], [nonce] }
 *   Signature = Sign(privateKey, ASCII(base64url(header) + '.' + base64url(payload)))
 *
 * Usage:
 *   // One signer instance per session (key pair lives in RAM).
 *   const signer = await DPoPSigner.create(cryptoProvider, { algorithm: 'ES256' });
 *
 *   // Generate a fresh proof for each outbound request.
 *   const dpopHeader = await signer.generateProof({
 *     method: 'POST',
 *     url:    'https://api.example.com/resource',
 *     accessToken: bearerToken,   // enables ath binding
 *     nonce: serverNonce,         // when use_dpop_nonce is required
 *   });
 *   request.headers['DPoP'] = dpopHeader;
 */
export class DPoPSigner {
  private readonly keyPair: DPoPKeyPair;
  private readonly cryptoProvider: IDPoPCryptoProvider;

  /** Use DPoPSigner.create() — constructor is private because key generation is async. */
  private constructor(
    cryptoProvider: IDPoPCryptoProvider,
    keyPair: DPoPKeyPair
  ) {
    this.cryptoProvider = cryptoProvider;
    this.keyPair = keyPair;
  }

  // ---------------------------------------------------------------------------
  // Static factory
  // ---------------------------------------------------------------------------

  /**
   * Asynchronous factory: generates a fresh DPoP key pair and returns a
   * fully initialised DPoPSigner.
   *
   * The generated key pair is held exclusively in volatile RAM for the lifetime
   * of the returned signer instance. Discard the signer to release the keys;
   * they will be garbage-collected without any disk persistence.
   *
   * @param cryptoProvider  Provider exposing SubtleCrypto + SHA-256 + CSPRNG.
   * @param config          Key configuration (algorithm selection, etc.).
   */
  public static async create(
    cryptoProvider: IDPoPCryptoProvider,
    config: DPoPKeyConfig = {}
  ): Promise<DPoPSigner> {
    const keyPair = await generateDPoPKeyPair(cryptoProvider, config);
    return new DPoPSigner(cryptoProvider, keyPair);
  }

  // ---------------------------------------------------------------------------
  // Proof generation
  // ---------------------------------------------------------------------------

  /**
   * Generates a signed DPoP proof JWT for the specified HTTP request.
   *
   * Each call produces a unique JWT via a fresh `jti` claim — proofs MUST NOT
   * be reused across requests because verifiers enforce single-use semantics.
   *
   * The returned compact serialisation is intended for the HTTP `DPoP` header:
   *   request.headers['DPoP'] = await signer.generateProof({ method, url });
   *
   * @param options  Request binding options (method, URL, access token, nonce).
   * @returns        Compact JWS string: base64url(header).base64url(payload).base64url(sig)
   */
  public async generateProof(options: DPoPProofOptions): Promise<string> {
    const { method, url, accessToken, nonce } = options;

    // Build the JWT header — public key embedded so the verifier needs no
    // prior key distribution step.
    const header: DPoPProofHeader = {
      typ: 'dpop+jwt',
      alg: this.keyPair.algorithm,
      jwk: this.keyPair.publicKeyJwk,
    };

    // Build the JWT payload.
    const payload: DPoPProofPayload = {
      jti: this.generateJti(),
      htm: method.toUpperCase(),
      htu: normalizeHtu(url),
      iat: Math.floor(Date.now() / 1000),
    };

    // Bind to the access token when provided (prevents token substitution).
    if (accessToken !== undefined) {
      payload.ath = await this.computeAth(accessToken);
    }

    // Include server nonce when the resource server demands it.
    if (nonce !== undefined) {
      payload.nonce = nonce;
    }

    return this.compact(header, payload);
  }

  // ---------------------------------------------------------------------------
  // Key introspection
  // ---------------------------------------------------------------------------

  /**
   * Returns a defensive copy of the public key JWK embedded in every proof.
   * Useful when pre-registering the public key with an authorization server
   * that supports the `dpop_jwk` parameter (RFC 9449 §6).
   */
  public getPublicKeyJwk(): JsonWebKey {
    return { ...this.keyPair.publicKeyJwk };
  }

  /** Returns the algorithm identifier used by this signer's key pair. */
  public getAlgorithm(): DPoPAlgorithm {
    return this.keyPair.algorithm;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Assembles and signs the compact JWT serialisation.
   *
   * Signing input per RFC 7515 §7.2.1:
   *   ASCII( base64url(headerJson) + '.' + base64url(payloadJson) )
   *
   * The resulting signature bytes are base64url-encoded and appended as the
   * third JWT segment.
   */
  private async compact(
    header: DPoPProofHeader,
    payload: DPoPProofPayload
  ): Promise<string> {
    const encodedHeader = base64UrlEncodeJson(header);
    const encodedPayload = base64UrlEncodeJson(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signingBytes = new TextEncoder().encode(signingInput);
    const signingParams = buildSigningParams(this.keyPair.algorithm);

    const rawSignature = await this.cryptoProvider.subtle.sign(
      signingParams,
      this.keyPair.privateKey,
      signingBytes
    );

    const encodedSignature = base64UrlEncode(new Uint8Array(rawSignature));
    return `${signingInput}.${encodedSignature}`;
  }

  /**
   * Generates a cryptographically random JWT ID (jti) to prevent proof replay.
   * Uses 16 random bytes (128 bits of entropy) encoded as base64url.
   */
  private generateJti(): string {
    const randomBytes = this.cryptoProvider.getRandomBytes(16);
    return base64UrlEncode(randomBytes);
  }

  /**
   * Computes the `ath` (access token hash) claim per RFC 9449 §4.2:
   *   ath = base64url( SHA-256( ASCII( access_token ) ) )
   *
   * Binds this proof to the specific access token, preventing an attacker from
   * reusing a stolen proof with a different token.
   */
  private async computeAth(accessToken: string): Promise<string> {
    const tokenBytes = new TextEncoder().encode(accessToken);
    const hashBytes = await this.cryptoProvider.sha256(tokenBytes);
    return base64UrlEncode(hashBytes);
  }
}
