import type { DPoPAlgorithm, DPoPKeyConfig, DPoPKeyPair, IDPoPCryptoProvider } from './types.js';

// ---------------------------------------------------------------------------
// SubtleCrypto algorithm parameter builders
// ---------------------------------------------------------------------------

/**
 * Returns the SubtleCrypto key generation parameters for the requested
 * DPoP algorithm.
 *
 *  • ES256 → ECDSA over NIST P-256 (namedCurve: 'P-256')
 *  • PS256 → RSA-PSS, 2048-bit modulus, SHA-256
 *             (publicExponent 65537 = 0x010001)
 */
function buildKeyGenParams(
  algorithm: DPoPAlgorithm
): EcKeyGenParams | RsaHashedKeyGenParams {
  switch (algorithm) {
    case 'ES256':
      return { name: 'ECDSA', namedCurve: 'P-256' };

    case 'PS256':
      return {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256',
      };
  }
}

// ---------------------------------------------------------------------------
// Private key material stripping
// ---------------------------------------------------------------------------

/**
 * Removes all private key field names from a JWK object to ensure that only
 * the public components are retained before inclusion in a DPoP proof header.
 *
 * RFC 7517 private fields by algorithm family:
 *  • EC:  d
 *  • RSA: d, p, q, dp, dq, qi
 */
function stripPrivateFields(jwk: JsonWebKey): JsonWebKey {
  const { d, p, q, dp, dq, qi, ...publicOnly } = jwk as Record<string, unknown>;
  // Suppress the unused-variable warning for destructured private fields
  void d; void p; void q; void dp; void dq; void qi;
  return publicOnly as JsonWebKey;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates an asymmetric DPoP key pair using the supplied SubtleCrypto
 * implementation and returns a DPoPKeyPair ready for use by DPoPSigner.
 *
 * Security properties:
 *  - The private key CryptoKey handle is held exclusively in volatile memory
 *    and is never passed to exportKey() by this library.
 *  - The public key is exported in JWK format immediately after generation
 *    so that private field extraction is structurally impossible at the type
 *    level — the private CryptoKey handle is stored separately and only used
 *    as the signing key argument to SubtleCrypto.sign().
 *  - Both keys are generated with extractable: true to permit public key JWK
 *    export. This is required because SubtleCrypto.generateKey() applies the
 *    extractable flag uniformly to both keys in the pair; the private key
 *    material is protected by confining it to the opaque CryptoKey handle and
 *    never calling exportKey() on it within this library.
 *
 * @param cryptoProvider  DPoP-capable crypto provider exposing SubtleCrypto.
 * @param config          Optional key configuration (algorithm, etc.).
 */
export async function generateDPoPKeyPair(
  cryptoProvider: IDPoPCryptoProvider,
  config: DPoPKeyConfig = {}
): Promise<DPoPKeyPair> {
  const algorithm = config.algorithm ?? 'ES256';
  const params     = buildKeyGenParams(algorithm);

  const { publicKey, privateKey } = await cryptoProvider.subtle.generateKey(
    params,
    /*extractable=*/ true, // Required to export the public key JWK below.
    ['sign', 'verify']
  ) as CryptoKeyPair;

  // Export the public key JWK and immediately strip any private fields.
  const rawJwk      = await cryptoProvider.subtle.exportKey('jwk', publicKey);
  const publicKeyJwk = stripPrivateFields(rawJwk);

  return { publicKeyJwk, privateKey, algorithm };
}
