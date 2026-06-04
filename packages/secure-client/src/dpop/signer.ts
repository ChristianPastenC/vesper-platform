import type {
  DPoPAlgorithm,
  DPoPKeyConfig,
  DPoPKeyPair,
  DPoPProofHeader,
  DPoPProofOptions,
  IDPoPCryptoProvider,
} from './types.js';
import { generateDPoPKeyPair } from './keys.js';
import {
  base64UrlEncode,
  base64UrlEncodeJson,
  buildSigningParams,
  normalizeHtu,
} from './utils.js';

/** RFC 9449 §4.2 DPoP proof JWT payload claims. */
interface DPoPProofPayload {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  ath?: string;
  nonce?: string;
}

/**
 * DPoPSigner
 *
 * Generates RFC 9449-compliant Demonstrating Proof-of-Possession (DPoP) proof
 * JWTs and signs them asymmetrically using the SubtleCrypto API.
 */
export class DPoPSigner {
  private readonly keyPair: DPoPKeyPair;
  private readonly cryptoProvider: IDPoPCryptoProvider;

  private constructor(
    cryptoProvider: IDPoPCryptoProvider,
    keyPair: DPoPKeyPair
  ) {
    this.cryptoProvider = cryptoProvider;
    this.keyPair = keyPair;
  }

  public static async create(
    cryptoProvider: IDPoPCryptoProvider,
    config: DPoPKeyConfig = {}
  ): Promise<DPoPSigner> {
    const keyPair = await generateDPoPKeyPair(cryptoProvider, config);
    return new DPoPSigner(cryptoProvider, keyPair);
  }

  public async generateProof(options: DPoPProofOptions): Promise<string> {
    const { method, url, accessToken, nonce } = options;

    const header: DPoPProofHeader = {
      typ: 'dpop+jwt',
      alg: this.keyPair.algorithm,
      jwk: this.keyPair.publicKeyJwk,
    };

    const payload: DPoPProofPayload = {
      jti: this.generateJti(),
      htm: method.toUpperCase(),
      htu: normalizeHtu(url),
      iat: Math.floor(Date.now() / 1000),
    };

    if (accessToken !== undefined) {
      payload.ath = await this.computeAth(accessToken);
    }

    if (nonce !== undefined) {
      payload.nonce = nonce;
    }

    return this.compact(header, payload);
  }

  public getPublicKeyJwk(): JsonWebKey {
    return { ...this.keyPair.publicKeyJwk };
  }

  public getAlgorithm(): DPoPAlgorithm {
    return this.keyPair.algorithm;
  }

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

  private generateJti(): string {
    const randomBytes = this.cryptoProvider.getRandomBytes(16);
    return base64UrlEncode(randomBytes);
  }

  private async computeAth(accessToken: string): Promise<string> {
    const tokenBytes = new TextEncoder().encode(accessToken);
    const hashBytes = await this.cryptoProvider.sha256(tokenBytes);
    return base64UrlEncode(hashBytes);
  }
}
