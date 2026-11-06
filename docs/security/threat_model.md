# Threat Modeling & Security Architecture Specification

## 1. System Perimeters & Trust Boundaries

```text
+---------------------------------------------------------------------------------------+
| EDGE CLIENT PERIMETER (Untrusted Physical Environment)                                |
|                                                                                       |
|  [ React Native UI / JS Realm ]                                                       |
|         |                                                                             |
|  ======================= TRUST BOUNDARY 1: JSI Native Boundary =====================  |
|         |                                                                             |
|  [ Native C++ Enclave (VolatileQueue) ]                                               |
|  - DRAM Locked via mlock(2)                                                           |
|  - Active Zeroization Watchdog                                                        |
|  - Ephemeral Keypair (Hardware StrongBox / Secure Enclave)                            |
+---------------------------------------------------------------------------------------+
                                          |
  ======================= TRUST BOUNDARY 2: Public Network Transport =================  |
                                          |
  [ HTTP/TLS + DPoP (RFC 9449) Proof + X-Vesper-Hash Payload Integrity ]                |
                                          |
+---------------------------------------------------------------------------------------+
| BACKEND CLOUD PERIMETER (Hardened Infrastructure)                                     |
|                                                                                       |
|  [ Ingestion API Gateway / Reverse Proxy ]                                            |
|         |                                                                             |
|  ======================= TRUST BOUNDARY 3: Internal Microservice Bus =================  |
|         |                                                                             |
|  [ Ingestion Core (Go) ] <======> [ Redis Idempotency Cluster (SET NX EX 900) ]       |
|         |                                                                             |
|  [ SQLite Metrics Storage / OpenTelemetry Forwarder ]                                 |
+---------------------------------------------------------------------------------------+
```

## 2. STRIDE Threat Categorization and Defenses

1. **Spoofing (S):**
   * *Threat:* An attacker intercepts network requests and attempts to replay them from an unauthorized client.
   * *Mitigation:* Cryptographic DPoP (RFC 9449) proof-of-possession binding each HTTP request to an ephemeral ECDSA private key held exclusively in the native enclave.
2. **Tampering (T):**
   * *Threat:* Dynamic instrumentation (Frida, Xposed) alters memory addresses in the mobile application to bypass security checks.
   * *Mitigation:* Continuous integrity watchdog monitoring hash chains and triggering immediate memory zeroization (`IntegrityBreachError`) and an encrypted 17-byte anomaly emission.
3. **Repudiation (R):**
   * *Threat:* A network interruption occurs during settlement, leading a merchant to claim a transaction never processed, causing a double-charge reattempt.
   * *Mitigation:* Atomic distributed idempotency in Redis (`SET NX EX 900`) combined with deterministic SHA-256 block hash chaining.
4. **Information Disclosure (I):**
   * *Threat:* Sensitive Authentication Data (SAD) remains in flash storage or DRAM, recoverable via physical extraction.
   * *Mitigation:* Zero-Disk Footprint (no secondary storage) and compiler-barrier Active Zeroization (`memset_s` + inline assembly barrier).
5. **Denial of Service (D):**
   * *Threat:* Intermittent cellular dropouts or third-party IdP failures block application execution.
   * *Mitigation:* Transient memory containment in volatile RAM with a deterministic 900-second TTL (MTPD).
6. **Elevation of Privilege (E):**
   * *Threat:* Execution in rooted/jailbroken devices attempting to access hardware keystore boundaries.
   * *Mitigation:* Strict fail-closed `DeviceIntegrityGuard` enforcing hardware-backed Keymaster/StrongBox.

## 3. Out-of-Scope Security Boundaries

To maintain rigor, the following threat vectors are formally declared outside the architectural boundary of this platform:
* **Silicon-Level Physical Decapping:** Physical attacks on semiconductor dies using focused ion beams (FIB) or electron microscopy to read hardware-level flash charges or keystore registers.
* **Compromised Baseband Operating System:** Vulnerabilities residing within the proprietary cellular baseband processor firmware below the operating system kernel.
* **Malicious Operating System Kernel:** Kernel-level rootkits or compromised kernel builds that subvert POSIX `mlock` system calls or intercept virtual memory mapping at the MMU level.
* **Cloud Infrastructure Physical Intrusion:** Physical access to cloud server hardware hosting the Redis cluster or Ingestion APIs.
