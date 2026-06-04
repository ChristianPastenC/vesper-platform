# @sovereign/secure-client

A client-side cryptographic resilience library designed to handle offline sequestration and secure communication.

## Core Features

1. **Volatile RAM Ledger**: Sequesters pending HTTP requests in memory during connection failures. Cryptographically chains requests using SHA-256 for runtime tamper detection.
2. **Deterministic Zeroization**: Actively overwrites sensitive request payloads and headers using byte-level `.fill(0)` operations on expiry or purge, mitigating heap memory exposure.
3. **Integrity Watchdog**: Scans the ledger continuously to detect active memory-flipping/tampering attempts, locking down queue replay if any anomaly is detected.
4. **Dynamic DPoP Proofs**: Generates fresh, single-use OAuth 2.0 Demonstration of Proof-of-Possession (DPoP) signatures dynamically upon queue drainage to maintain security token validity.
5. **Transport Agnostic**: Features adapters for `fetch`, Axios, and GraphQL, ensuring seamless integration into varied frontend architectures.

## Architecture

- `src/core/`: Contains the central orchestration logic (`SovereignClientCore`) and trapping logic.
- `src/ledger/`: Manages the volatile memory queue and deterministic zeroization.
- `src/dpop/`: Asymmetric key generation and proof creation.
- `src/adapters/`: Transport-layer HTTP and GraphQL clients.
- `src/contracts/`: Core abstract interfaces and crypto provider requirements.

## Build

Compile typescript using Yarn:
```bash
yarn build
```
