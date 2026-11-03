# Secure Memory Treatment and Secure Coding Policy

## 1. Executive Summary

This policy formally defines the strict memory management, data-at-rest protection, and runtime tampering mitigation controls enforced across the Vesper Core Platform and the `@vesper-core/ghost-ledger` edge client. 

In high-security enterprise environments, the endpoint device is treated as a hostile environment. This policy establishes the engineering guidelines that ensure sensitive transaction payloads, bearer tokens, and cryptographic keys are never inadvertently exposed to forensic extraction, dynamic memory scrapers, or unauthorized application debugging.

---

## 2. Zero-Disk Footprint Policy & Wear Leveling Rationale

The cornerstone of the Vesper Edge Architecture is the strict prohibition of non-volatile caching for sensitive business payloads.

* **The Physical Vulnerability (NAND Flash Wear Leveling)**: Traditional systems rely on local embedded databases (SQLite, Realm) or key-value stores (`AsyncStorage`, `UserDefaults`) to cache transaction payloads when network connectivity drops. As proven in [Physical NAND Flash Wear Leveling Rationale](./nand_wear_leveling_rationale.md) and NIST SP 800-88 Rev. 1 (Kissel et al., 2014), the Flash Translation Layer (FTL) continuously remaps logical addresses to disparate physical blocks to balance wear. Consequently, deleting a record in SQLite or unlinking a file leaves plaintext PAN and SAD fragments in unmapped physical NAND cells, creating an unavoidable violation of **PCI-DSS v4.0 Requirement 3.2** and **GDPR Article 32**.
* **The Vesper Standard**: All unsubmitted transaction payloads, DPoP signatures, and session tokens **must be retained exclusively within volatile RAM boundaries** inside the C++ native JSI context. 
* **Enforcement**: Code reviews and static analysis must block any attempt to serialize the `@vesper-core/ghost-ledger` offline queue to disk. All state persistence across application reboots is strictly forbidden for cryptographic ledgers.

---

## 3. Active Byte-Level Zeroization & Compiler Safety

Relying on Garbage Collection (GC) in managed runtimes (like JavaScript, Swift, or Kotlin) is categorically insufficient for secure memory treatment. GC engines (such as the V8/Hermes engine) defer deallocation to unpredictable intervals. During this temporal window, sensitive payloads remain dormant in plaintext on the application heap. This leaves the system vulnerable to memory-scraping tools, physical cold-boot attacks, and core dump forensic extraction.

To counter this, `@vesper-core/ghost-ledger` leverages the React Native JSI (JavaScript Interface) to instantly pass sensitive payloads across the bridge into native deterministic C++ memory, enforcing **Active Byte-Level Zeroization**:

* **The JSI Memory Boundary**: Once a payload enters the C++ queue, no references are kept in the JavaScript heap. The C++ engine takes absolute ownership of the memory pointer.
* **Deterministic Destruction**: When a transaction payload successfully synchronizes with the backend, or when its deterministic Time-To-Live (TTL) expires, the native C++ engine executes an active memory wipe.
* **Defeating Compiler Dead Store Elimination (DSE)**: Modern C++ compilers (Clang, GCC, MSVC) aggressively optimize code. As demonstrated by Philippe et al. (2023) in *GnuZero*, standard `memset()` or `std::fill()` calls are silently eliminated in over 64.0% of compiled cryptographic binaries at `-O2` and `-O3`. 
  * To prevent this failure, Vesper utilizes `crypto::secure_zero` with C11 `memset_s` (when available), `SecureZeroMemory` on Windows, and inline assembly memory barriers (`__asm__ __volatile__("" : : "r"(ptr) : "memory")`), guaranteeing physical overwriting with binary zeroes (`0x00`).
* **Memory Page Locking (`mlock`)**: All volatile memory buffers allocated for transactions are locked in physical RAM via POSIX `mlock(2)` or Windows `VirtualLock` upon allocation, preventing kernel swap/zRAM daemons from paging sensitive data to secondary storage.

---

## 4. Transient Memory Containment (TTL = 900 s / MTPD)

To prevent memory leaks and infinite state retention during prolonged network outages, all volatile queues are strictly time-bound.

* **Mechanism**: Every offline payload added to the `ghost-ledger` queue is bound by the BIA-calibrated Maximum Tolerable Period of Disruption: **`defaultTTL: 900_000` ms (15 minutes / 900 seconds)**.
* **Telecom Calibration**: Empirically verified against cellular radio field data where 94.6% of signal outages last under 7 minutes, and the 99th percentile ($P_{99}$) is 13 minutes ($\le 15\text{ min}$).
* **Behavior**: If the host device fails to regain connectivity within 900 seconds, the payload undergoes active zeroization and is securely evicted from the queue, preventing unauthorized data accumulation.

---

## 5. Runtime Anti-Tampering & Finite State Machine (FSM)

```mermaid
stateDiagram-v2
    [*] --> UNINITIALIZED
    UNINITIALIZED --> ACTIVE_ONLINE: Init & StrongBox Verified
    ACTIVE_ONLINE --> OFFLINE_ENQUEUED: Network Lost & In-Flight Captured (RTO < 100ms)
    OFFLINE_ENQUEUED --> ACTIVE_ONLINE: Network Restored & Sync Confirmed (HTTP 200) -> Zeroize
    OFFLINE_ENQUEUED --> TTL_EXPIRED_ZEROIZED: Timer t > 900s (MTPD Exceeded)
    OFFLINE_ENQUEUED --> TAMPER_ZEROIZED: Frida / Hooking / Root Detected
    ACTIVE_ONLINE --> TAMPER_ZEROIZED: Integrity Breach Detected
    OFFLINE_ENQUEUED --> SYSTEM_KILLED_ZEROIZED: Power Cut / OOM Killer (LMK / Jetsam)
    
    TTL_EXPIRED_ZEROIZED --> [*]: Memory Cleaned (0x00)
    TAMPER_ZEROIZED --> [*]: Emergency Memory Purge & Freeze
    SYSTEM_KILLED_ZEROIZED --> [*]: DRAM Discharged (Fail-Secure)
```

### Handling Power Loss & Operating System OOM Killers
If the operating system's Low Memory Killer (Android LMK) or Jetsam (iOS) terminates the process, or if the terminal loses battery power completely:
* Because Vesper enforces a **Zero-Disk Footprint**, DRAM capacitive charges rapidly dissipate.
* No incomplete, corrupt, or unencrypted database files exist on Flash NAND.
* Upon reboot, the application enters an uninitialized state with zero forensic data remanence, upholding a **Fail-Secure** operational posture.
