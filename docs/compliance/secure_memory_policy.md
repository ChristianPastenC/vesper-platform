# Secure Memory Treatment and Secure Coding Policy

## 1. Executive Summary

This policy formally defines the strict memory management, data-at-rest protection, and runtime tampering mitigation controls enforced across the Vesper Core Platform and the `@vesper/ghost-ledger` edge client. 

In high-security enterprise environments, the endpoint device is treated as a hostile environment. This policy establishes the engineering guidelines that ensure sensitive transaction payloads, bearer tokens, and cryptographic keys are never inadvertently exposed to forensic extraction, dynamic memory scrapers, or unauthorized application debugging.

---

## 2. Zero-Disk Footprint Policy

The cornerstone of the Vesper Edge Architecture is the strict prohibition of non-volatile caching for sensitive business payloads.

* **The Vulnerability**: Traditional systems rely on unencrypted physical flash storage (e.g., `AsyncStorage`, `UserDefaults`, `SQLite`) to cache transaction payloads when network connectivity drops. This creates a severe data-at-rest exposure vector, heavily penalized by PCI-DSS v4.0 and GDPR.
* **The Vesper Standard**: All unsubmitted transaction payloads, DPoP signatures, and session tokens **must be retained exclusively within volatile RAM boundaries** inside the C++ native JSI context. 
* **Enforcement**: Code reviews and static analysis must block any attempt to serialize the `SovereignSecureClient` offline queue to disk. All state persistence across application reboots is strictly forbidden for cryptographic ledgers.

---

## 3. Active Byte-Level Zeroization & Compiler Safety

Relying on Garbage Collection (GC) in managed runtimes (like JavaScript, Swift, or Kotlin) is categorically insufficient for secure memory treatment. GC engines (such as the V8/Hermes engine) defer deallocation to unpredictable intervals. During this temporal window, sensitive payloads remain dormant in plaintext on the application heap. This leaves the system vulnerable to memory-scraping tools, physical cold-boot attacks, and core dump forensic extraction.

To counter this, `@vesper/ghost-ledger` leverages the React Native JSI (JavaScript Interface) to instantly pass sensitive payloads across the bridge into native deterministic C++ memory, enforcing **Active Byte-Level Zeroization**:

* **The JSI Memory Boundary**: Once a payload enters the C++ queue, no references are kept in the JavaScript heap. The C++ engine takes absolute ownership of the memory pointer.
* **Deterministic Destruction**: When a transaction payload successfully synchronizes with the backend, or when its deterministic Time-To-Live (TTL) expires, the native C++ engine does not simply "free" the memory. It executes an active memory wipe.
* **Defeating Compiler Dead Store Elimination (DSE)**: Modern C++ compilers (Clang, GCC) aggressively optimize code. If a developer uses a standard `memset()` or `std::fill()` on a buffer right before freeing it, the compiler often deletes the zeroization step entirely (Dead Store Elimination) to save CPU cycles, assuming the data is no longer needed. 
  * To prevent this catastrophic security failure, the Vesper C++ engine utilizes compiler-safe zeroization functions (e.g., `explicit_bzero` on Linux/macOS, `SecureZeroMemory` on Windows, or `memset_s`) to guarantee the CPU executes the binary overwrite (`\0`) regardless of optimization flags.
* **Forensic Outcome**: If forensics tools (like `fridump`) attempt to dump the application's memory heap after a transaction is synchronized or evicted, they will extract only an empty array of binary zeroes.

---

## 4. Transient Memory Containment (TTL)

To prevent memory leaks and infinite state retention during prolonged network outages, all volatile queues are strictly time-bound.

* **Mechanism**: Every offline payload added to the `ghost-ledger` queue is bound by a maximum TTL (e.g., `defaultTTL: 60_000` ms).
* **Behavior**: If the host device fails to regain connectivity within the specified TTL, the payload undergoes active zeroization (as specified in Section 3) and is securely evicted from the queue.
* **User Experience**: This ensures deterministic system behavior, preventing memory bloat and application crashes, while gracefully surfacing a timeout failure to the UI without exposing data.

---

## 5. Runtime Anti-Tampering & Memory Purge

In scenarios where an attacker possesses physical access to the device and attempts to attach dynamic instrumentation frameworks (e.g., Frida, Cycript) to elevate privileges or inspect memory in real-time, the application must aggressively protect itself.

* **Mechanism**: The architecture utilizes a runtime watchdog (cross-tested via KVM/Frida DAST pipelines during CI/CD) to detect memory hooking, tampering, or malicious JSI bridge manipulation.
* **The `IntegrityBreachError` Protocol**: If the watchdog detects an anomaly, it immediately triggers an `IntegrityBreachError`.
* **Fail-Secure Execution**: Upon triggering this error, the system initiates an emergency global purge. All active cryptographic keys, offline queues, and DPoP signatures are instantaneously zeroized from RAM, and the application execution loop is forcefully terminated. The attacker is left holding a destroyed, empty memory heap.
