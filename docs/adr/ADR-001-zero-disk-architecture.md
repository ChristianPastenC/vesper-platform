# ADR-001: Zero-Disk Architecture for Mobile Payment Enclaves

## Status
Accepted

## Context
Under PCI-DSS v4.0 (Requirements 3.2 and 3.4) and CNBV Circular Única de Bancos, storing Sensitive Authentication Data (SAD: CVV, PIN blocks, full track data) post-authorization on endpoint devices is strictly prohibited. 

When network connectivity fails on mobile Point-of-Sale (mPOS) terminals, standard engineering patterns resort to local offline caching using SQLite, Realm, or key-value stores (`AsyncStorage`, `UserDefaults`). 

However, modern smartphones utilize solid-state NAND flash memory managed by a Flash Translation Layer (FTL). NAND physics mandate an "erase-before-write" cycle across large blocks (512 KB to 8 MB), while writes occur in pages (4 KB to 16 KB). To prevent performance degradation and manage cell endurance, the FTL executes wear-leveling algorithms: updates and deletes are written to newly allocated physical pages, leaving stale pages marked as invalid without physically altering their electrical charges. Consequently, standard file unlinking (`unlink`) or SQL `DELETE` commands do not erase data from physical NAND silicon. Forensic hardware extraction (JTAG, Chip-off) can readily recover plaintext cardholder fragments from retired flash blocks (NIST SP 800-88 Rev. 1, Kissel et al., 2014).

## Decision
We deliberately reject local database storage on mobile clients. All in-flight transaction payloads, cryptographic proofs, and tokens are retained exclusively within volatile RAM boundaries inside a native C++ enclave (`@vesper-core/ghost-ledger`). Memory pages are locked in physical RAM using `mlock(2)` (POSIX) or `VirtualLock` (Windows) to prevent operating system paging to flash-based swap partitions or zRAM.

## Consequences
### Positive
* Complete compliance with PCI-DSS v4.0 Req. 3.2: zero non-volatile forensic footprint on endpoint devices.
* Immediate immunity against NAND physical memory harvesting and chip-off extraction.
* Sub-millisecond queue operations through direct in-memory linked lists.

### Negative / Trade-offs
* Operating system termination (battery depletion, Low Memory Killer / Jetsam) destroys the in-flight buffer. This is mitigated by our Fail-Safe posture (ADR-003), where business confidentiality supersedes local durability.
* Buffer capacity is strictly bounded by deterministic memory quotas (max 50 payloads, 900 s TTL).
