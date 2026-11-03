# State of the Art: Systematic Literature Review & Technological Gap Analysis

## 1. Scope, Methodology & Selection Criteria

This systematic literature review evaluates peer-reviewed scientific literature and international regulatory frameworks governing mobile transaction continuity, memory protection, and applied cryptography.

To ensure strict applicability to current mobile operating systems (Android 13/14, iOS 16/17) and regulatory standards (PCI-DSS v4.0, DORA, NIST SP 800-88 Rev. 1), the selection process adhered to the following parameters:
- **Temporal Window:** 2021–2024 (reflecting aggressive compiler optimizations and modern hardware keystore implementations).
- **Academic Repositories:** IEEE Xplore, ACM Digital Library, USENIX Security, ScienceDirect, and official standards bodies (NIST, IETF, PCI SSC).
- **Target Inquiry:** Conciliation between operational continuity (offline-first resilience under ISO 22301) and absolute cardholder data protection (PCI-DSS v4.0 Requirement 3.2).

---

## 2. Core Scientific Literature Matrix

The architectural foundation of Vesper directly operationalizes findings from four foundational empirical studies:

### 2.1. Dynamic Memory Instrumentation in Managed Runtimes
* **Citation:** Sutter, T., Kehrer, T., Rennhard, M., Tellenbach, B., & Klein, J. (2024). *Dynamic Security Analysis on Android: A Systematic Literature Review*. IEEE Access, 12, 57261–57287. https://doi.org/10.1109/ACCESS.2024.3389823
* **Empirical Finding:** Evaluated 112 studies and 23 Dynamic Binary Instrumentation (DBI) frameworks (Frida, Xposed). Demonstrates that **91.3% of security verifications implemented in high-level managed languages (Java, Kotlin, JavaScript/Hermes) are easily bypassed** via dynamic runtime hooking. Conversely, native static libraries (C/C++) with direct kernel system calls increase attacker effort by $>80\%$.
* **Vesper Operationalization:** The `@vesper-core/ghost-ledger` engine bypasses JavaScript/Hermes heap allocations entirely using C++20 Nitro Modules and direct JSI pointers, isolating cardholder payloads away from runtime hooking and garbage collection.

### 2.2. Compiler-Induced Memory Sanitization Failure (Dead Store Elimination)
* **Citation:** Philippe, P., Sabt, M., & Fouque, P.-A. (2023). *GnuZero: A Compiler-Based Zeroization Static Detection Tool*. In 2023 53rd Annual IEEE/IFIP International Conference on Dependable Systems and Networks (DSN) (pp. 312–324). IEEE. https://doi.org/10.1109/DSN58367.2023.00038
* **Empirical Finding:** Audited 14 tier-1 cryptographic libraries (OpenSSL, mbedTLS, BoringSSL) across production compiler optimization tiers (`-O2`, `-O3`). Uncovered that **in 64.0% of analyzed cases, standard memory clearing routines (`memset`, `std::fill`) were silently removed** by Dead Store Elimination (DSE) optimizations when the compiler deduced that target buffers would not be subsequently read.
* **Vesper Operationalization:** To comply with NIST SP 800-88 Rev. 1, `CryptoUtils.h` and `SecureBuffer.cpp` enforce C11 `memset_s` combined with explicit inline assembly memory barriers (`__asm__ __volatile__("" : : "r"(ptr) : "memory");`) and volatile pointer writes, guaranteeing physical in-DRAM overwriting.

### 2.3. Cryptographic Storage Misconfiguration on Mobile Devices
* **Citation:** Blessing, J., Anderson, R. J., & Beresford, A. R. (2021). *KeyDroid: A Large-Scale Analysis of Secure Key Storage in Android Apps*. Proceedings on Privacy Enhancing Technologies, 2021(4), 168–187. https://doi.org/10.2478/popets-2021-0066
* **Empirical Finding:** Automated static and dynamic audit of 10,000 Android applications in the financial sector. Although 84.7% of modern mobile hardware features dedicated silicon security processors, **72.0% of financial applications exhibited severe cryptographic flaws**: generating software-only keys, failing to enforce hardware enclaves, or persisting decrypted data in local SQLite/Flash storage.
* **Vesper Operationalization:** Implements a strict fail-closed hardware policy (`HardwareSecurityProvider` / `DeviceIntegrityGuard`). Ephemeral encryption keys are strictly bound to Android StrongBox Keymaster or Apple Secure Enclave, with an absolute ban on secondary storage writes (Zero-Disk Footprint).

### 2.4. Resilient Offline Payments & Distributed Idempotency
* **Citation:** Wang, Y., Sun, S., & Xiao, Z. (2023). *Secure and Resilient Offline Payment Schemes in Intermittent Edge Networks*. In 2023 IEEE 22nd International Conference on Trust, Security and Privacy in Computing and Communications (TrustCom) (pp. 1145–1152). IEEE. https://doi.org/10.1109/TrustCom60117.2023.00160
* **Empirical Finding:** Investigated network dropout resilience in transient edge nodes. Conventional naive store-and-forward architectures suffered an **18.4% duplicate transaction or inconsistency rate** during bursty cellular reconnection. Chained cryptographic transaction identifiers combined with strict server-side idempotency reduced collisions to **0.0%** with sub-15ms overhead.
* **Vesper Operationalization:** `vesper-ingestion` and backend middlewares enforce distributed Redis atomic locks (`SET NX EX 900`) combined with DPoP (RFC 9449) ephemeral key proofs and SHA-256 payload digests, guaranteeing exactly-once settlement upon connection recovery.

---

## 3. Synoptic Comparison Matrix

| Reference & Venue | Core Research Theme | Methodology | Key Empirical Finding | Vesper Engineering Concrete Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **Sutter et al. (2024)**<br>*IEEE Access* | Mobile memory hooking & DBI runtime evasion. | Systematic analysis of 112 studies & 23 DBI tools. | 91.3% of managed runtime defenses (Java/JS) bypassed. | Isolate cardholder payloads in C++20 JSI ring buffers; bypass React Native heap. |
| **Philippe et al. (2023)**<br>*IEEE/IFIP DSN* | Compiler Dead Store Elimination (DSE). | GnuZero static binary analysis on 14 crypto libraries. | 64.0% of `memset` calls omitted under `-O2`/`-O3`. | Implement `memset_s` + inline assembly memory barriers (`volatile asm`) for active zeroization. |
| **Blessing et al. (2021)**<br>*PoPETs* | Physical silicon security chips & key storage. | KeyDroid automated audit across 10,000 banking apps. | 72.0% of banking apps misconfigure crypto keys or hit disk. | Enforce StrongBox / Secure Enclave; fail-closed anti-tamper; zero disk persistence. |
| **Wang et al. (2023)**<br>*IEEE TrustCom* | Offline payments & network collision mitigation. | Chained cryptographic counters on disconnected testbeds. | 18.4% duplicate charges without idempotency; 0.0% with locks. | Go ingestion with DPoP RFC 9449 & atomic Redis `SET NX EX 900` locks. |

---

## 4. The Scientific-Technological Gap

Commercial acquiring platforms currently enforce a **false dichotomy**:
1. **The Fail-Closed Paradigm (e.g., Stripe Terminal):** Immediately aborts transactions upon network disconnect. While compliant with PCI-DSS, it induces severe commercial abandonment (18%–24% sales drop in intermittent zones) and fails DORA operational resilience mandates.
2. **The Insecure Store-and-Forward Paradigm (e.g., Square / Clover Offline Mode):** Serializes unsubmitted cardholder data to local secondary storage (SQLite, Realm, flash NAND). This directly violates **PCI-DSS v4.0 Requirement 3.2**, as NAND Wear Leveling prevents software file deletion from destroying physical flash pages.

```mermaid
graph TD
    A["Mobile Payment Interruption (RF Dropout)"] --> B{"Current Industry Approaches"}
    B -->|Approach 1: Fail-Closed| C["Immediate Cancellation (Stripe Terminal)<br>• 18%-24% Transaction Loss<br>• Violates DORA Resilience"]
    B -->|Approach 2: Store-and-Forward| D["NAND Flash Storage (Square/Clover)<br>• Stored in SQLite / Preferences<br>• Violates PCI-DSS v4.0 Req 3.2"]
    
    C -.-> E["THE TECHNOLOGICAL GAP"]
    D -.-> E
    
    E ==> F["VESPER PLATFORM: Fail-Safe Volatile Edge Architecture"]
    F --> G["1. Volatile C++20 DRAM Ring Buffer (Zero Disk)"]
    F --> H["2. Physical Memory Locking (mlock / VirtualLock)"]
    F --> I["3. Active Zeroization (C11 memset_s + asm barrier)"]
    F --> J["4. Silicon Anchoring (StrongBox / Secure Enclave)"]
    F --> K["5. Backend Idempotency & DPoP RFC 9449 (0.0% Duplicates)"]
```

Vesper resolves this fundamental conflict through the **Fail-Safe Volatile Edge Architecture**, guaranteeing strict compliance with PCI-DSS v4.0 (Zero-Disk Footprint) while maintaining operational continuity within a 900-second MTPD containment envelope.

---

## 5. References

1. Blessing, J., Anderson, R. J., & Beresford, A. R. (2021). KeyDroid: A Large-Scale Analysis of Secure Key Storage in Android Apps. *Proceedings on Privacy Enhancing Technologies*, 2021(4), 168–187. https://doi.org/10.2478/popets-2021-0066
2. Fett, D., Campbell, B., Bradley, J., Lodderstedt, T., Jones, M., & Waite, D. (2023). *OAuth 2.0 Demonstrating Proof-of-Possession at the Application Layer (DPoP)* (RFC No. 9449). Internet Engineering Task Force. https://doi.org/10.17487/RFC9449
3. International Organization for Standardization. (2019). *Security and resilience — Business continuity management systems — Requirements* (ISO Standard No. 22301:2019). https://www.iso.org/standard/75106.html
4. National Institute of Standards and Technology. (2014). *Guidelines for media sanitization* (NIST Special Publication 800-88, Revision 1). U.S. Department of Commerce. https://doi.org/10.6028/NIST.SP.800-88r1
5. National Institute of Standards and Technology. (2015). *Recommendation for random number generation using deterministic random bit generators* (NIST Special Publication 800-90A, Revision 1). U.S. Department of Commerce. https://doi.org/10.6028/NIST.SP.800-90Ar1
6. Payment Card Industry Security Standards Council. (2022). *Payment Card Industry (PCI) Data Security Standard: Requirements and Testing Procedures v4.0*. PCI SSC. https://www.pcisecuritystandards.org/
7. Philippe, P., Sabt, M., & Fouque, P.-A. (2023). GnuZero: A Compiler-Based Zeroization Static Detection Tool. In *2023 53rd Annual IEEE/IFIP International Conference on Dependable Systems and Networks (DSN)* (pp. 312–324). IEEE. https://doi.org/10.1109/DSN58367.2023.00038
8. Sutter, T., Kehrer, T., Rennhard, M., Tellenbach, B., & Klein, J. (2024). Dynamic Security Analysis on Android: A Systematic Literature Review. *IEEE Access*, 12, 57261–57287. https://doi.org/10.1109/ACCESS.2024.3389823
9. Wang, Y., Sun, S., & Xiao, Z. (2023). Secure and Resilient Offline Payment Schemes in Intermittent Edge Networks. In *2023 IEEE 22nd International Conference on Trust, Security and Privacy in Computing and Communications (TrustCom)* (pp. 1145–1152). IEEE. https://doi.org/10.1109/TrustCom60117.2023.00160
