# Technical Specification of Cryptographic Mechanisms

## 1. Executive Summary

This document provides the formal technical specification for the cryptographic mechanisms deployed across the Vesper Core Platform and the `@vesper-core/ghost-ledger` client SDK. The cryptographic suite is engineered to enforce a **Zero-Trust architecture**, guaranteeing data integrity, non-repudiation, and perfect session binding even during hostile transport transitions or offline execution phases.

---

## 2. Cryptographic Primitives & Specifications

The Vesper Platform standardizes on the following cryptographic algorithms to ensure compliance with modern enterprise and financial security standards (e.g., PCI-DSS, NIST guidelines):

| Mechanism | Algorithm Standard | Primary Use Case |
| :--- | :--- | :--- |
| **Session Authentication** | ECDSA (Curve P-256) / ES256 | JWT signing and validation |
| **Proof-of-Possession** | ECDSA (Curve P-256) | DPoP signature verification (Anti-Theft) |
| **Payload Integrity** | HMAC-SHA256 | MitM protection via `X-Sovereign-Hash` |
| **Offline Ledger Chaining** | SHA-256 | Immutable offline transaction sequencing |

---

## 3. Implementation Details

### 3.1. Demonstrating Proof-of-Possession (DPoP)
To eliminate the risk of bearer token theft and replay attacks, the platform employs **DPoP**.
* **Engineered Component**: `internal/handler/middleware/dpop_auth.go`
* **Mechanism**: The client device generates an asymmetric key pair (ECDSA P-256) inside a secure enclave. The private key never leaves the device. Every HTTP request must include a dynamic DPoP signature proving possession of the private key tied to the session token.
* **Security Outcome**: Even if an attacker successfully steals a session token via network sniffing or cross-site scripting, the token is mathematically useless without the hardware-bound private key.

### 3.2. Payload Integrity Validation (HMAC)
Data sent over hostile networks is strictly protected against tampering.
* **Engineered Component**: `internal/handler/middleware/hash_validator.go`
* **Mechanism**: The `@vesper-core/ghost-ledger` computes an HMAC-SHA256 hash of the JSON payload body immediately before transport. This hash is appended to the request as the `X-Sovereign-Hash` header. The Go backend recalculates the hash upon receipt.
* **Security Outcome**: Prevents Man-in-the-Middle (MitM) attackers from modifying transaction amounts or routing details in transit. Any byte mismatch immediately triggers a `400 Bad Request` and terminates the connection.

### 3.3. Offline Transaction Ledger (Cryptographic Chaining)
The platform ensures that transactions queued locally during network outages cannot be tampered with, reordered, or manipulated prior to synchronization.
* **Engineered Component**: `internal/usecase/ledger_validator.go` & `SovereignSecureClient` (C++)
* **Mechanism**: Transactions are cryptographically chained in volatile RAM using the following mathematical formulation:
  
  $$ H_n = \text{SHA256}(Payload_n \parallel H_{n-1} \parallel Timestamp_n) $$

* **Security Outcome**: This creates a localized, immutable ledger. If a hostile actor or debugger attempts to drop, modify, or insert a transaction while the device is offline, the mathematical chain breaks. Upon reconnection, the `ledger_validator.go` backend immediately detects the invalid cryptographic proof and rejects the entire synchronized batch.

### 3.4. Identity & Session Tokens (JWT)
* **Engineered Component**: `internal/adapter/auth/token_service.go` & `middleware/jwt_auth.go`
* **Mechanism**: Standard JSON Web Tokens (JWT) signed asymmetrically (ES256). The token headers enforce strict expiration (TTL) and subject binding to the DPoP public key fingerprint.

---

## 4. Key Management & Entropy (CSPRNG)

The `@vesper-core/ghost-ledger` SDK is designed to be environment-agnostic while demanding high-entropy cryptographic primitives. It relies on a mandatory `cryptoProvider` interface supplied during initialization:

```typescript
cryptoProvider: {
  getRandomBytes: (n) => window.crypto.getRandomValues(new Uint8Array(n)),
  sha256: async (d) => new Uint8Array(await window.crypto.subtle.digest('SHA-256', d))
}
```

* **Outcome**: The SDK guarantees that all ephemeral keys, nonces, and transaction identifiers rely strictly on the host operating system's Cryptographically Secure Pseudo-Random Number Generator (CSPRNG), avoiding insecure mathematical fallbacks like `Math.random()`.
