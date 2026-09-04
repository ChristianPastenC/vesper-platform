# @vesper-core/ghost-ledger (v0.0.1-beta.2)

[![npm version](https://img.shields.io/npm/v/@vesper-core/ghost-ledger.svg?style=flat-square)](https://www.npmjs.com/package/@vesper-core/ghost-ledger)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/npm/l/@vesper-core/ghost-ledger.svg?style=flat-square)](https://github.com/vesper-core/ghost-ledger/blob/main/LICENSE)

`@vesper-core/ghost-ledger` is a cryptographic middleware for **React Native** designed to solve a critical problem: **protecting your HTTP request payloads in volatile memory (RAM) when the network fails**.

When your mobile app loses connection or faces server errors (like 503 or 504), pending requests with sensitive payloads can be left exposed in the JavaScript heap. This library prevents payload theft by automatically catching these failed requests, encrypting them, and securely locking them down in a native C++ memory ledger until the network is restored.

Built exclusively for React Native using high-performance **Nitro Modules**, it offers robust, offline-capable security and optional end-to-end telemetry observability without dealing with the underlying cryptographic complexity.

---

## Installation

You can install the package using your preferred package manager:

```bash
# Using yarn
yarn add @vesper-core/ghost-ledger@0.0.1-beta.2

# Using npm
npm install @vesper-core/ghost-ledger@0.0.1-beta.2
```

### Peer Dependencies & Requirements

This library uses [Nitro Modules](https://nitro.margelo.com/) for its core C++ execution. It is **exclusively for React Native** and will not run in standard web environments. Ensure the peer dependency is installed:

```bash
yarn add react-native-nitro-modules
```

To maintain strict multi-platform compatibility across iOS and Android without bloating the core, we require a native cryptographic provider. We highly recommend `react-native-quick-crypto`:

```bash
yarn add react-native-quick-crypto
```

---

## Getting Started

Integrating `@vesper-core/ghost-ledger` is straightforward. The usage is split into two simple steps.

### Step 1: Initialize the `SovereignClientCore`

Set up the client at the root of your React Native application.

> [!IMPORTANT]
> **Dependency Injection:** The library requires you to provide a `nativeCryptoProvider`. By injecting `react-native-quick-crypto`, `@vesper-core/ghost-ledger` avoids being tightly coupled to specific React Native architectures while maximizing hashing performance.

```typescript
import { SovereignClientCore, FetchAdapter } from '@vesper-core/ghost-ledger';
import QuickCrypto from 'react-native-quick-crypto';
import NetInfo from '@react-native-community/netinfo';

const client = SovereignClientCore.getInstance({
  cryptoProvider: {
    getRandomBytes: (n) => QuickCrypto.randomBytes(n),
    sha256: async (d) => new Uint8Array(QuickCrypto.createHash('sha256').update(d).digest())
  },
  networkResolver: async () => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  },
  networkAdapter: new FetchAdapter(),
  // Optional: Enable real-time telemetry to track integrity breaches or queue drops
  telemetry: {
    apiKey: 'your-vesper-api-key',
    bundleId: 'com.your.app',
    endpoint: 'https://api.vesper.local/v1/support/telemetry'
  }
});
```

### Step 2: Execute Requests

Once initialized, use `executeRequest()` to send your secure HTTP requests. You can easily encode JSON payloads using `encodeJsonBody()`.

```typescript
import { encodeJsonBody } from '@vesper-core/ghost-ledger';

// If the network drops or returns 503/504, the payload is securely sequestered in C++ RAM.
const response = await client.executeRequest('tx_123', {
  method: 'POST',
  url: 'https://api.yourdomain.com/v1/secure-endpoint',
  body: encodeJsonBody({
    amount: 1500,
    currency: 'USD'
  })
});
```

---

## Testing Environments (Mock Mode)

> [!TIP]
> **Gotcha:** For Jest test setups or Node.js scripting where compile-time native code linking (Nitro Modules) is not possible, you **must** use Mock Mode.

`@vesper-core/ghost-ledger` provides a built-in pure JavaScript fallback engine to prevent Metro or Jest resolution errors during unit testing.

### Enabling Mock Mode

#### 1. Via Global Flag (Recommended for Jest)
Define `globalThis.__SOVEREIGN_MOCK__ = true` globally in your test setup file (`jest.setup.js`):

```typescript
// Define mock flag globally to skip native C++ JSI loading during tests
globalThis.__SOVEREIGN_MOCK__ = true;
```

#### 2. Via Client Configuration
Pass `mock: true` in the `SovereignClientCoreConfig`:

```typescript
const client = SovereignClientCore.getInstance({
  // ... other config
  mock: true
});
```

---

## Advanced: Core Security Features

For those interested in the underlying mechanics, the security architecture of the library is built upon 5 fundamental implementation pillars:

1. **Volatile RAM Ledger (C++ Engine Core):** 
   During connectivity failures or transient server responses (such as HTTP 503/504), outgoing requests are serialized to binary format (`Uint8Array`) and enqueued in a native C++ static ledger (`SovereignSecureCore`) in physical RAM (`std::vector<uint8_t>`). Each block is cryptographically linked to its predecessor using chained SHA-256 hashes.

2. **Deterministic Zeroization (Active Memory Erasure):** 
   To prevent credentials or sensitive payloads from lingering in the JavaScript heap, the library enforces active zeroization. The C++ core explicitly calls `std::fill` on all payload vectors, previous hashes, and current hashes immediately after successful dispatch or upon TTL (Time-To-Live) expiration.

3. **Integrity Watchdog (Tamper-Detection Engine):** 
   A background watchdog validates the cryptographic chain of the ledger. If it detects any dynamic memory manipulation (such as injection, memory corruption, or bit-flipping), it instantly freezes queue execution (`isLocked = true`, `isIntegrityCompromised = true`), stopping active TTL timeouts to preserve evidence.

4. **Dynamic DPoP Proofs (Ephemeral Proof-of-Possession):** 
   The library handles the generation and signing of ephemeral OAuth 2.0 Demonstration of Proof-of-Possession (DPoP) proofs (RFC 9449). Ephemeral keys are managed inside TS via platform WebCrypto (`SubtleCrypto`), keeping the C++ core lightweight.

5. **Transport Agnostic Core (Command Pattern Isolation):** 
   The core is decoupled from the network transport layer, utilizing the Command pattern (`() => Promise<T>`) exposed via the `ISovereignNetworkAdapter` interface. This allows developers to plug in clean adapters for various networking stacks—such as Fetch, Axios, and GraphQL.

---



## Operational In-Memory Flow

The sequence diagram below outlines the runtime lifecycle of a request, demonstrating error trapping, memory sequestration, and native C++ core delegation:

```text
  [ Application ]
        │
        ▼ executeRequest(payload)
 ┌─────────────┐
 │ Sovereign   │───(Compromised)──► [ Throw IntegrityBreachError ]
 │ ClientCore  │
 └──────┬──────┘
        │ (Intact)
        ▼
   [ Network Check ]
        ├─────────────────────────┐
        │ (Online & Stable)       │ (Offline or HTTP 503/504)
        ▼                         ▼
  ┌──────────┐             ┌───────────────┐
  │ Network  │             │ Sovereign     │
  │ Adapter  │             │ MemoryQueue   │
  └─────┬────┘             └──────┬────────┘
        │                         │ enqueue()
        ▼                         ▼
   [ HTTP 2xx ]            ┌───────────────┐
        │                  │ Native C++    │
        ▼                  │ Engine (JSI)  │
 [ Zeroize RAM ]           └──────┬────────┘
                                  │
                                  ▼
                          [ Cryptographic Block Hash ]
                          [ Zeroize Temp RAM ]
                                  │
                                  ▼
                          [ Return Promise ]
```

---

## Exported API Reference

| Category | Exported Symbol | Type | Description |
| :--- | :--- | :--- | :--- |
| **Core** | `SovereignClientCore` | Class | Main singleton orchestrator. Dispatches/traps requests and manages queue playbacks. |
| **Core** | `SovereignMemoryQueue` | Class | Volatile JSI queue adapter. Controls C++ static ledger blocks and integrity verification. |
| **Network** | `FetchAdapter` / `AxiosAdapter` / `GraphQLAdapter` | Class | Transport adapters implementing request handling over platform HTTP stacks. |
| **Network** | `fetchWithTrapping` / `axiosWithTrapping` / `graphqlWithTrapping` | Function | Interceptor functions mapping HTTP responses and throwing `SovereignHttpError`. |
| **Crypto** | `generateDPoPKeyPair()` | Function | Generates ephemeral RSA/EC asymmetric key pairs. |
| **Crypto** | `withDPoP(client, executor)` | Function | Binds async execution context with lazy-generated DPoP proofs. |
| **Binary** | `serializeAdapterRequest` / `deserializeAdapterRequest` | Function | Packs/unpacks request parameters to/from flat zeroizable binary arrays. |
| **Binary** | `encodeJsonBody` / `encodeTextBody` / `encodeHeaders` / `decodeHeaders` / `decodeBody` | Function | Secure zeroizable buffer formatting and decoding helpers. |
| **Errors** | `SovereignHttpError` | Class | Specialized HTTP status exception indicating trapping eligibility. |
| **Errors** | `IntegrityBreachError` | Class | Fired when watchdog thread detects memory tampering or bit-flips. |
| **Contracts**| `ISovereignCryptoProvider` / `IDPoPCryptoProvider` | Interface | Platform-agnostic cryptographic driver signatures. |
| **Contracts**| `ISovereignNetworkAdapter` | Interface | Abstract transport adapter signature. |
| **Config** | `SovereignClientCoreConfig` / `SessionLifecycleObservers` | Interface | Configuration and observer callback structures. |

---

## Contributing

We welcome contributions! If you find a bug or want to propose a new feature, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
