# @vesper-core/ghost-ledger

[![Console Dashboard](https://img.shields.io/badge/Console-Dashboard-00C7B7?style=flat-square&logo=netlify)](https://vesper-console.netlify.app/)
[![npm version](https://img.shields.io/npm/v/@vesper-core/ghost-ledger.svg?style=flat-square)](https://www.npmjs.com/package/@vesper-core/ghost-ledger)
[![CI](https://github.com/ChristianPastenC/vesper-platform/actions/workflows/ghost-ledger-ci.yml/badge.svg)](https://github.com/ChristianPastenC/vesper-platform/actions/workflows/ghost-ledger-ci.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/npm/l/@vesper-core/ghost-ledger.svg?style=flat-square)](https://github.com/ChristianPastenC/vesper-platform/blob/main/LICENSE)

`@vesper-core/ghost-ledger` is a cryptographic middleware for **React Native** designed to solve a critical problem: **protecting your HTTP request payloads in volatile memory (RAM) when the network fails**.

When your mobile app loses connection or faces server errors (like 503 or 504), pending requests with sensitive payloads can be left exposed in the JavaScript heap. This library prevents payload theft by automatically catching these failed requests, encrypting them, and securely locking them down in a native C++20 memory ledger until the network is restored.

Built for React Native using high-performance **Nitro Modules (JSI)** with a built-in pure JavaScript fallback engine for Node.js, Jest, and Web testing environments.

---

## Installation

Install the package along with its required React Native runtime dependencies:

```bash
# Using yarn
yarn add @vesper-core/ghost-ledger react-native-nitro-modules react-native-quick-crypto @react-native-community/netinfo

# Using npm
npm install @vesper-core/ghost-ledger react-native-nitro-modules react-native-quick-crypto @react-native-community/netinfo
```

### Peer Dependencies & Requirements

| Package | Role | Notes |
| :--- | :--- | :--- |
| `react-native-nitro-modules` | Native C++20 JSI bridge (`>= 0.35.10`) | Required for physical RAM ledger execution on iOS & Android. |
| `react-native-quick-crypto` | Native CSPRNG & SHA-256 provider | Injected into `cryptoProvider` for hardware-accelerated hashing. |
| `@react-native-community/netinfo` | Connectivity state resolver | Used by `networkResolver` to detect offline transitions and trigger queue replay. |

---

## Getting Started

Integrating `@vesper-core/ghost-ledger` is split into two simple steps.

### Step 1: Initialize the `GhostClientCore`

Set up the client at the root of your React Native application.

> [!IMPORTANT]
> **Dependency Injection:** The library requires you to provide a `cryptoProvider` (`IGhostCryptoProvider`). By injecting `react-native-quick-crypto`, `@vesper-core/ghost-ledger` stays decoupled from specific React Native architectures while maximizing hashing performance.

```typescript
import { GhostClientCore, FetchAdapter } from '@vesper-core/ghost-ledger';
import QuickCrypto from 'react-native-quick-crypto';
import NetInfo from '@react-native-community/netinfo';

export const client = GhostClientCore.getInstance({
  cryptoProvider: {
    getRandomBytes: (n) => new Uint8Array(QuickCrypto.randomBytes(n)),
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
    endpoint: 'https://vesper-ingestion.onrender.com/api/v1/support/telemetry'
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

## Telemetry & Observability (Current Storage Limitations)

> [!WARNING]
> **Incomplete Telemetry Persistence (Database Limitation):** While the client-side binary telemetry emitter (`getTelemetrySnapshot()`) is fully functional in both the native C++20 engine and the Node.js/JS fallback engine, **end-to-end telemetry persistence is currently incomplete at the backend database layer**.

### Architectural Record for Node.js & Cloud Consumers
1. **Ephemeral Database Storage in Reference Cloud (`telemetry.db`):**
   - The reference ingestion backend (`vesper-ingestion`) currently operates over an embedded SQLite instance stored on an ephemeral container filesystem without an external persistent Time-Series Database (TSDB) or PostgreSQL cluster.
   - Consequently, historical telemetry streams and dynamic API keys bound via **TOFU (*Trust On First Use*)** (`X-Bundle-ID`) are volatile across container cold-starts and redeployments.
2. **Node.js & Fallback Telemetry Behavior:**
   - When running in Node.js, Jest, or Web environments (`mock: true` or `globalThis.__GHOST_MOCK__ = true`), the `FallbackQueue` records 17-byte Little-Endian binary telemetry frames (`COMPUTE_HASH_LATENCY`, `ZEROIZATION_TRIGGERED`, `INTEGRITY_COMPROMISED`) in process memory.
   - Without a persistent database backing the ingestion endpoint, telemetry events drained from the ring buffer are only retained for the active runtime session of the ingestion node. Full persistent database storage is scheduled for future platform releases.

---

## Testing Environments (Mock Mode)

> [!TIP]
> **Gotcha:** For Jest test setups or Node.js scripting where compile-time native code linking (Nitro Modules) is not available, enable Mock Mode.

`@vesper-core/ghost-ledger` provides a built-in pure JavaScript fallback engine (`FallbackQueue`) to prevent Metro or Jest resolution errors during unit testing and Node.js verification.

### Enabling Mock Mode

#### 1. Via Global Flag (Recommended for Jest / Node.js)
Define `globalThis.__GHOST_MOCK__ = true` globally in your test setup file (`jest.setup.js`):

```typescript
// Define mock flag globally to skip native C++ JSI loading during tests
globalThis.__GHOST_MOCK__ = true;
```

#### 2. Via Client Configuration
Pass `mock: true` in the `GhostClientCoreConfig`:

```typescript
const client = GhostClientCore.getInstance({
  // ... other config
  mock: true
});
```

---

## Advanced: Core Security Features

The security architecture of the library is built upon 5 fundamental implementation pillars:

1. **Volatile RAM Ledger (C++20 Engine Core):** 
   During connectivity failures or transient server responses (such as HTTP 503/504), outgoing requests are serialized to binary format (`Uint8Array`) and enqueued in a native C++20 static ledger (`GhostSecureCore`) locked in physical RAM via `mlock` / `VirtualLock` to prevent NAND flash swap paging. Each block is cryptographically linked to its predecessor using chained SHA-256 hashes.

2. **Deterministic Zeroization (Active Memory Erasure):** 
   To prevent credentials or sensitive payloads from lingering in memory, the C++20 core enforces active zeroization using C11 `memset_s`, `SecureZeroMemory`, or `explicit_bzero` reinforced with compiler Dead Store Elimination (DSE) barriers immediately after dispatch or upon MTPD TTL (900s default) expiration.

3. **Integrity Watchdog (Tamper-Detection Engine):** 
   A background watchdog validates the cryptographic chain of the ledger. If it detects any dynamic memory manipulation (such as Frida injection, memory corruption, or bit-flipping), it instantly freezes queue execution (`isLocked = true`, `isIntegrityCompromised = true`), stopping active TTL timeouts to preserve forensic state.

4. **Dynamic DPoP Proofs (Ephemeral Proof-of-Possession):** 
   The library handles the generation and signing of ephemeral OAuth 2.0 Demonstration of Proof-of-Possession (DPoP) proofs (RFC 9449).

5. **Transport Agnostic Core (Command Pattern Isolation):** 
   The core is decoupled from the network transport layer via the `IGhostNetworkAdapter` interface, providing built-in adapters for Fetch, Axios, and GraphQL.

---

## Operational In-Memory Flow

The sequence diagram below outlines the runtime lifecycle of a request, demonstrating error trapping, memory sequestration, and native C++20 core delegation:

```text
  [ Application ]
        │
        ▼ executeRequest(payload)
 ┌─────────────┐
 │ Ghost       │───(Compromised)──► [ Throw IntegrityBreachError ]
 │ ClientCore  │
 └──────┬──────┘
        │ (Intact)
        ▼
   [ Network Check ]
        ├─────────────────────────┐
        │ (Online & Stable)       │ (Offline or HTTP 503/504)
        ▼                         ▼
  ┌──────────┐             ┌───────────────┐
  │ Network  │             │ Ghost         │
  │ Adapter  │             │ MemoryQueue   │
  └─────┬────┘             └──────┬────────┘
        │                         │ enqueue()
        ▼                         ▼
   [ HTTP 2xx ]            ┌───────────────┐
        │                  │ Native C++20  │
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
| **Core** | `GhostClientCore` | Class | Main singleton orchestrator. Dispatches/traps requests and manages queue playbacks. |
| **Core** | `GhostMemoryQueue` | Class | Volatile JSI queue adapter. Controls C++ static ledger blocks and integrity verification. |
| **Network** | `FetchAdapter` / `AxiosAdapter` / `GraphQLAdapter` | Class | Transport adapters implementing request handling over platform HTTP stacks. |
| **Network** | `fetchWithTrapping` / `axiosWithTrapping` / `graphqlWithTrapping` | Function | Interceptor functions mapping HTTP responses and throwing `GhostHttpError`. |
| **Crypto** | `generateDPoPKeyPair()` | Function | Generates ephemeral RSA/EC asymmetric key pairs. |
| **Crypto** | `withDPoP(client, executor)` | Function | Binds async execution context with lazy-generated DPoP proofs. |
| **Binary** | `serializeAdapterRequest` / `deserializeAdapterRequest` | Function | Packs/unpacks request parameters to/from flat zeroizable binary arrays. |
| **Binary** | `encodeJsonBody` / `encodeTextBody` / `encodeHeaders` / `decodeHeaders` / `decodeBody` | Function | Secure zeroizable buffer formatting and decoding helpers. |
| **Errors** | `GhostHttpError` | Class | Specialized HTTP status exception indicating trapping eligibility. |
| **Errors** | `IntegrityBreachError` | Class | Fired when watchdog thread detects memory tampering or bit-flips. |
| **Contracts**| `IGhostCryptoProvider` / `IDPoPCryptoProvider` | Interface | Platform-agnostic cryptographic driver signatures. |
| **Contracts**| `IGhostNetworkAdapter` | Interface | Abstract transport adapter signature. |
| **Config** | `GhostClientCoreConfig` / `SessionLifecycleObservers` | Interface | Configuration and observer callback structures. |

---

## Contributing

We welcome contributions! If you find a bug or want to propose a new feature, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
