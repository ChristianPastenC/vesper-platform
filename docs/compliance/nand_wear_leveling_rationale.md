# Physical NAND Flash Wear Leveling & PCI-DSS v4.0 Forensics Rationale

## 1. Executive Summary & Regulatory Problem Statement

Under **PCI-DSS v4.0 (Requirements 3.2 and 3.4)** and **CNBV Circular Única de Bancos**, financial institutions and payment facilitators (PayTechs) are strictly prohibited from retaining Sensitive Authentication Data (SAD: full cardholder tracks, CVV/CVC, PIN blocks) and unencrypted Primary Account Numbers (PAN) post-authorization on endpoint devices.

In mobile point-of-sale (mPOS) and mobile checkout applications, commercial solutions frequently implement "Store-and-Forward" persistence using local embedded databases (SQLite, Realm) or key-value stores (`AsyncStorage`, `UserDefaults`). Engineering teams routinely assume that executing SQL `DELETE` or unlinking file pointers (`unlink(2)`) sanitizes data from the terminal.

This document formalizes the low-level hardware rationale proving why **software-level file deletion is physically incapable of sanitizing Flash storage**, establishing the cryptographic justification for Vesper's **Zero-Disk Volatile Memory Architecture**.

---

## 2. Flash Translation Layer (FTL) & Wear Leveling Mechanics

Modern solid-state memory in smartphones (UFS and eMMC chips) relies on NAND flash geometry organized into physical pages (typically 4 KB to 16 KB) and physical erase blocks (typically 128 to 512 pages, 512 KB to 8 MB):

```text
+-----------------------------------------------------------------------------+
| Logical Block Addressing (LBA) Layer: OS / SQLite / POSIX Filesystem        |
|  [ Sector 0x1000: /data/user/0/app/databases/transactions.db (SQLite) ]    |
+-----------------------------------------------------------------------------+
                                      |
                     [ Flash Translation Layer (FTL) ]
                                      |
       +------------------------------+------------------------------+
       |                                                             |
+-----------------------------+               +-----------------------------+
| Physical Block #42 (NAND)   |               | Physical Block #108 (NAND)  |
| - Page 0: Active Data       |               | - Page 0: Remanent PAN/SAD  |
| - Page 1: Remanent CVV      |               |   (Unmapped, not erased!)   |
| - Page 2: Outdated Sector   |               | - Page 1: Out-of-place write|
+-----------------------------+               +-----------------------------+
```

### 2.1. The "Erase-Before-Write" Constraint
NAND flash memory cells cannot be overwritten in-place. A physical page can only transition from erased (`1`) to programmed (`0`). To write new data to an existing page, the entire physical erase block must be erased in a high-voltage operation.

### 2.2. Out-of-Place Writes & Dynamic Remapping
To avoid the severe latency penalty and write amplification of erasing whole blocks for every page update:
1. The Flash Translation Layer (FTL) controller writes modified data to a **new, freshly erased physical page**.
2. The FTL updates its internal mapping table, pointing the Logical Block Address (LBA) to the new physical page.
3. The original physical page containing the previous transaction data is marked as "invalid" or "stale", but **its physical electrical charges remain completely unaltered**.

### 2.3. Wear Leveling Algorithms
NAND flash cells degrade after finite program/erase cycles (typically 1,000 to 3,000 cycles for TLC/QLC). FTL controllers execute wear-leveling algorithms (dynamic and static) to distribute write cycles evenly across all physical blocks:
* **Stale Pages are Deferred:** Erasure of invalid blocks is delayed until background garbage collection runs during device idle states or when free blocks are exhausted.
* **Over-Provisioning Reserves:** Mobile storage chips maintain 7% to 20% over-provisioned hidden physical capacity invisible to the operating system kernel.

---

## 3. Forensic Exploitation Vectors (Kissel et al., 2014)

As demonstrated by NIST SP 800-88 Rev. 1 (*Guidelines for Media Sanitization* - Kissel et al., 2014):

1. **JTAG & Chip-Off Forensics:** A physical attacker or malicious technician with hardware tools can desolder the NAND chip or connect via JTAG/test pads directly to the memory bus, bypassing the FTL controller.
2. **Raw Block Extraction:** The forensic investigator extracts both valid and invalid physical pages. Because SQLite writes transactions, updates statuses, and deletes rows, **dozens of historical plaintext PAN/SAD fragments exist scattered across retired physical flash blocks**.
3. **Impossibility of Secure File Wiping on Flash:** Commands such as `shred`, `srm`, or SQLite `VACUUM` only write new blocks at the LBA layer; the FTL simply directs the zeroes to new physical pages, leaving the original cardholder data untouched in the old physical blocks.

---

## 4. The Vesper Zero-Disk Architecture Countermeasure

To eliminate this vulnerability completely and ensure 100% compliance with PCI-DSS v4.0 Requirement 3.2:

```mermaid
flowchart TD
    subgraph UI ["User Interface (React Native / JSI)"]
        A[Cardholder Transaction Entry] -->|Direct JSI Memory Bridge| B[Nitro Modules Native Buffer]
    end

    subgraph NativeCore ["Vesper C++20 Core (Ghost Ledger)"]
        B -->|mlock Physical Page Lock| C["Volatile RAM Ring Buffer (CRAM)"]
        C -->|DPoP Proof & Ephemeral AES-256| D[Encrypted Volatile Block]
        D -->|Network Available (t <= 900s)| E[Ingestion Dispatch to Go Backend]
        D -->|TTL Expired (t > 900s) OR Tamper| F[Active Zeroization: memset_s & DSE Barrier]
    end

    subgraph Hardware ["Hardware Enclave (StrongBox / Secure Enclave)"]
        G[Ephemeral Key Derivation] -.->|Hardware Root of Trust| D
    end

    subgraph DiskFlash ["NAND Flash Storage (SQLite / Realm / AsyncStorage)"]
        H["[STRICTLY ZERO WRITES] No PAN, No SAD, No Cryptograms"]
    end

    F -->|Zeroed RAM| I[Heap Sanitized: 0x00]
    E -->|200 OK Response| F

    style DiskFlash fill:#450a0a,stroke:#dc2626,stroke-width:2px;
    style NativeCore fill:#0f172a,stroke:#3b82f6,stroke-width:2px;
```

1. **Strict Prohibition of Flash I/O:** No transaction block, cardholder token, or cryptographic key ever touches SQLite, Realm, or filesystem storage.
2. **Physical Page Locking (`mlock`):** Memory buffers in RAM are locked with `mlock()` / `VirtualLock()` to prevent the OS kernel from paging them into swap or compressed zRAM (which can be flushed to flash under memory pressure).
3. **Active C11 Zeroization:** Upon HTTP 200 OK or upon expiration of the 900-second MTPD window, `memset_s` and assembly memory barriers overwrite the DRAM cells with binary zeroes (`0x00`), leaving zero forensic remanence.
