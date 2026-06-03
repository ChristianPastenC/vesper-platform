/**
 * @sovereign/secure-client — abstract interface contracts
 *
 * This module is the single source of truth for every abstract interface in
 * the SovereignCore framework. It has ZERO imports — all types are either
 * primitives or sourced from the TypeScript standard library (lib.es2022,
 * lib.dom) with no NPM package dependencies whatsoever.
 *
 * Zero-dependency guarantee:
 *   The absence of any import statement in this file is intentional and
 *   enforced. Any future change that adds an `import` from an NPM package
 *   is a breaking violation of this contract.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Interface hierarchy
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   ISovereignCryptoProvider          ← base: SHA-256 + CSPRNG
 *     └── IDPoPCryptoProvider         ← extended: SubtleCrypto for asymmetric ops
 *
 *   ISovereignNetworkAdapter          ← transport contract (fetch/Axios/GraphQL/…)
 *     └── ISovereignNetworkAdapterFactory<O>  ← DI-friendly factory contract
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Implementor responsibilities per platform
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  ISovereignCryptoProvider:
 *   • Browser          → window.crypto (getRandomValues + subtle.digest)
 *   • React Native     → expo-crypto or react-native-quick-crypto
 *   • Node.js ≥ 15     → node:crypto (webcrypto.getRandomValues + subtle.digest)
 *
 *  IDPoPCryptoProvider:
 *   • Browser          → { subtle: window.crypto.subtle, ... }
 *   • React Native     → { subtle: (await import('expo-crypto')).subtle, ... }
 *   • Node.js ≥ 15     → { subtle: (await import('node:crypto')).webcrypto.subtle, ... }
 *
 *  ISovereignNetworkAdapter:
 *   • fetch            → FetchAdapter (src/adapters/fetch.ts)
 *   • Axios            → AxiosAdapter (src/adapters/axios.ts)
 *   • GraphQL          → GraphQLAdapter (src/adapters/graphql.ts)
 *   • Custom           → implement ISovereignNetworkAdapter directly
 */

// =============================================================================
// SECTION 1 — Cryptographic Provider Interfaces
// =============================================================================

/**
 * ISovereignCryptoProvider
 *
 * Platform-agnostic interface for the cryptographic primitives consumed by
 * SovereignMemoryQueue and SovereignClientCore.
 *
 * Only two operations are required: CSPRNG byte generation and SHA-256 hashing.
 * Keeping the surface minimal ensures the interface can be satisfied by any
 * platform-native crypto API without pulling in third-party libraries.
 *
 * Implementation contract:
 *  - getRandomBytes MUST use a cryptographically secure pseudo-random number
 *    generator (CSPRNG). Math.random() is explicitly forbidden.
 *  - sha256 MUST return exactly 32 bytes. Implementations that return a
 *    different length will corrupt the ledger's block-chaining invariant.
 *
 * @example Browser
 * ```ts
 * const cryptoProvider: ISovereignCryptoProvider = {
 *   getRandomBytes: (n) => window.crypto.getRandomValues(new Uint8Array(n)),
 *   sha256: async (data) => {
 *     const buf = await window.crypto.subtle.digest('SHA-256', data);
 *     return new Uint8Array(buf);
 *   },
 * };
 * ```
 *
 * @example React Native (expo-crypto)
 * ```ts
 * import * as Crypto from 'expo-crypto';
 * const cryptoProvider: ISovereignCryptoProvider = {
 *   getRandomBytes: (n) => Crypto.getRandomBytes(n),
 *   sha256: async (data) => {
 *     const hex = await Crypto.digestStringAsync(
 *       Crypto.CryptoDigestAlgorithm.SHA256,
 *       Buffer.from(data).toString('base64'),
 *       { encoding: Crypto.CryptoEncoding.BASE64 },
 *     );
 *     return new Uint8Array(Buffer.from(hex, 'hex'));
 *   },
 * };
 * ```
 *
 * @example Node.js ≥ 15
 * ```ts
 * import { webcrypto } from 'node:crypto';
 * const cryptoProvider: ISovereignCryptoProvider = {
 *   getRandomBytes: (n) => webcrypto.getRandomValues(new Uint8Array(n)),
 *   sha256: async (data) => {
 *     const buf = await webcrypto.subtle.digest('SHA-256', data);
 *     return new Uint8Array(buf);
 *   },
 * };
 * ```
 */
export interface ISovereignCryptoProvider {
  /**
   * Returns a freshly allocated Uint8Array of `byteLength` cryptographically
   * random bytes.
   *
   * Security requirements:
   *  - MUST use a platform CSPRNG (getRandomValues, crypto.randomBytes, etc.)
   *  - MUST NOT use Math.random() or Date.now() as entropy sources
   *  - The returned buffer is owned by the caller; the implementation MUST NOT
   *    retain a reference to it.
   *
   * @param byteLength  Number of random bytes to generate. Must be > 0.
   */
  getRandomBytes(byteLength: number): Uint8Array;

  /**
   * Computes the SHA-256 digest of the supplied data.
   *
   * Security requirements:
   *  - MUST return exactly 32 bytes (256 bits).
   *  - MUST be deterministic: identical inputs always produce identical output.
   *  - MUST use SHA-256 as defined in FIPS PUB 180-4.
   *
   * @param data  Input bytes to hash.
   * @returns     Promise resolving to a 32-byte Uint8Array digest.
   */
  sha256(data: Uint8Array): Promise<Uint8Array>;
}

/**
 * IDPoPCryptoProvider
 *
 * Extension of ISovereignCryptoProvider that adds SubtleCrypto access for
 * the asymmetric operations required by the DPoP subsystem (key generation
 * and ECDSA/RSA-PSS signing).
 *
 * The library uses only three SubtleCrypto methods:
 *  - generateKey()  — key pair creation (keys never leave SubtleCrypto)
 *  - exportKey()    — public key JWK export (private key is never exported)
 *  - sign()         — proof signature generation
 *
 * Implementation contract:
 *  - The `subtle` property MUST expose a SubtleCrypto-conformant object.
 *  - The private CryptoKey handle MUST remain opaque inside the JS engine.
 *    The library never calls exportKey() on the private key.
 *
 * @example Browser
 * ```ts
 * const dpopProvider: IDPoPCryptoProvider = {
 *   subtle: window.crypto.subtle,
 *   getRandomBytes: (n) => window.crypto.getRandomValues(new Uint8Array(n)),
 *   sha256: async (data) => new Uint8Array(
 *     await window.crypto.subtle.digest('SHA-256', data)
 *   ),
 * };
 * ```
 *
 * @example Node.js ≥ 15
 * ```ts
 * import { webcrypto } from 'node:crypto';
 * const dpopProvider: IDPoPCryptoProvider = {
 *   subtle: webcrypto.subtle as SubtleCrypto,
 *   getRandomBytes: (n) => webcrypto.getRandomValues(new Uint8Array(n)),
 *   sha256: async (data) => new Uint8Array(
 *     await webcrypto.subtle.digest('SHA-256', data)
 *   ),
 * };
 * ```
 *
 * @example React Native (react-native-quick-crypto)
 * ```ts
 * import QuickCrypto from 'react-native-quick-crypto';
 * const dpopProvider: IDPoPCryptoProvider = {
 *   subtle: QuickCrypto.subtle as unknown as SubtleCrypto,
 *   getRandomBytes: (n) => QuickCrypto.getRandomValues(new Uint8Array(n)),
 *   sha256: async (data) => new Uint8Array(
 *     await QuickCrypto.subtle.digest('SHA-256', data)
 *   ),
 * };
 * ```
 */
export interface IDPoPCryptoProvider extends ISovereignCryptoProvider {
  /**
   * A SubtleCrypto-conformant interface used exclusively for:
   *  - generateKey()  — asymmetric key pair creation
   *  - exportKey()    — public key JWK export (private key is never exported)
   *  - sign()         — DPoP proof JWT signing
   */
  readonly subtle: SubtleCrypto;
}

// =============================================================================
// SECTION 2 — Network Adapter Interfaces
// =============================================================================

/**
 * SovereignAdapterRequest
 *
 * Transport-agnostic descriptor of an outbound HTTP request.
 * Passed to ISovereignNetworkAdapter.request() by the caller.
 *
 * All fields use built-in TypeScript types only — no NPM dependencies.
 */
export interface SovereignAdapterRequest {
  /**
   * HTTP method, case-insensitive.
   * The adapter MUST normalise to uppercase before sending.
   * Examples: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
   */
  method: string;

  /**
   * Absolute URL of the target resource.
   * For GraphQL endpoints this is the schema endpoint URL; query/mutation
   * details are embedded in the `body` field.
   */
  url: string;

  /**
   * HTTP request headers.
   * Keys and values MUST be strings. The adapter merges these with any
   * default headers it injects (e.g. Content-Type, Accept).
   *
   * To pass DPoP and Authorization headers, include them here:
   *   { 'Authorization': `DPoP ${token}`, 'DPoP': dpopProof }
   */
  headers?: Record<string, string>;

  /**
   * Request body.
   *  - string:     sent verbatim (UTF-8 encoded by the transport layer)
   *  - Uint8Array: sent as binary (octet-stream by default)
   *  - null:       no body (GET, DELETE requests)
   *
   * For JSON payloads, serialize before passing:
   *   body: JSON.stringify({ key: value })
   *
   * For GraphQL, serialize the operation descriptor:
   *   body: JSON.stringify({ query, variables, operationName })
   */
  body?: string | Uint8Array | null;

  /**
   * Abort signal for cooperative request cancellation.
   * Pass an AbortController.signal to cancel the in-flight request.
   * Adapters MUST forward this to the underlying transport call.
   */
  signal?: AbortSignal | null;

  /**
   * Request timeout in milliseconds.
   * The adapter SHOULD implement this via AbortSignal.timeout() or an
   * equivalent platform mechanism.
   * When omitted, the adapter's own default timeout applies.
   */
  timeoutMs?: number;
}

/**
 * SovereignAdapterResponse<T>
 *
 * Transport-agnostic descriptor of a completed HTTP response.
 * Returned by ISovereignNetworkAdapter.request() on success.
 *
 * The adapter is responsible for:
 *  - Throwing SovereignHttpError for non-2xx status codes.
 *  - Parsing the response body into type T.
 *  - Normalising headers to Record<string, string>.
 */
export interface SovereignAdapterResponse<T = unknown> {
  /** HTTP status code of the response (always 2xx when resolved). */
  readonly status: number;

  /** HTTP status text ('OK', 'Created', etc.). */
  readonly statusText: string;

  /**
   * Response headers normalised to a string-keyed, string-valued record.
   * Multi-value headers are joined with ', ' (RFC 7230 §3.2.2).
   */
  readonly headers: Readonly<Record<string, string>>;

  /**
   * Parsed response body.
   * The type parameter T is the expected shape; adapters MUST parse JSON
   * unless the Content-Type indicates binary data.
   */
  readonly data: T;
}

/**
 * ISovereignNetworkAdapter
 *
 * The formal interface that every transport adapter MUST implement.
 *
 * Adopting this interface (instead of ad-hoc executor closures) gives:
 *  - Type-safe adapter injection via dependency injection containers
 *    (Angular's `provide`, NestJS `@Inject`, etc.)
 *  - Clean unit-testability: adapters can be mocked with a simple object literal
 *  - Framework-level interoperability: any adapter can replace another
 *
 * Error contract (required for Error Trapping Matrix compatibility):
 *  - Non-2xx responses     → throw SovereignHttpError(status)
 *  - Transport failure     → throw TypeError('Network request failed')
 *                            (or let the underlying fetch/Axios throw it)
 *  - GraphQL errors array  → throw GraphQLRequestError (NOT frozen by matrix)
 *
 * @example Implementing a custom adapter
 * ```ts
 * class MyAdapter implements ISovereignNetworkAdapter {
 *   async request<T>(config: SovereignAdapterRequest): Promise<SovereignAdapterResponse<T>> {
 *     // ... perform the HTTP call ...
 *     if (!response.ok) throw new SovereignHttpError(response.status);
 *     return { status: response.status, statusText: 'OK', headers: {}, data: await response.json() };
 *   }
 * }
 * ```
 *
 * @example Injecting via Angular DI
 * ```ts
 * @Injectable({ providedIn: 'root' })
 * class TransferService {
 *   constructor(
 *     @Inject(SOVEREIGN_ADAPTER) private readonly adapter: ISovereignNetworkAdapter,
 *   ) {}
 * }
 * ```
 *
 * @example Mocking in unit tests
 * ```ts
 * const mockAdapter: ISovereignNetworkAdapter = {
 *   request: jest.fn().mockResolvedValue({
 *     status: 200, statusText: 'OK', headers: {}, data: { id: '1' },
 *   }),
 * };
 * ```
 */
export interface ISovereignNetworkAdapter {
  /**
   * Executes a single HTTP request described by `config` and returns a typed
   * response on success.
   *
   * @param config  Transport-agnostic request descriptor.
   * @returns       Promise resolving to a 2xx SovereignAdapterResponse<T>.
   * @throws        SovereignHttpError   — HTTP 4xx/5xx (feeds Error Trapping Matrix)
   * @throws        TypeError            — transport-layer failure (no response)
   */
  request<T = unknown>(config: SovereignAdapterRequest): Promise<SovereignAdapterResponse<T>>;
}

/**
 * ISovereignNetworkAdapterFactory<TOptions>
 *
 * DI-friendly factory interface for constructing ISovereignNetworkAdapter
 * instances from a configuration object.
 *
 * Use this interface when your framework's DI system needs to defer adapter
 * construction until runtime configuration is available (e.g. base URL from
 * environment variables, auth tokens from a store).
 *
 * @example Angular factory provider
 * ```ts
 * export const ADAPTER_FACTORY = new InjectionToken<ISovereignNetworkAdapterFactory<ApiConfig>>(
 *   'SOVEREIGN_ADAPTER_FACTORY'
 * );
 *
 * providers: [
 *   {
 *     provide: ADAPTER_FACTORY,
 *     useClass: FetchAdapterFactory,
 *   },
 * ]
 * ```
 */
export interface ISovereignNetworkAdapterFactory<TOptions = Record<string, unknown>> {
  /**
   * Creates and returns a new ISovereignNetworkAdapter configured with
   * the supplied options.
   *
   * @param options  Adapter-specific configuration (base URL, auth, etc.).
   */
  create(options: TOptions): ISovereignNetworkAdapter;
}
