# ADR-003: Fail-Safe State Model Under Sudden Process Termination

## Status
Accepted

## Context
Mobile operating systems aggressively reclaim resources under memory pressure or thermal throttling. The Android Low Memory Killer (LMK) and iOS Jetsam daemon can terminate the mPOS host process without notice (`SIGKILL`). Furthermore, edge terminals may experience total power collapse (battery detachment).

In conventional software engineering, architectures strive for *Durability* (the "D" in ACID) by ensuring transactions survive crashes via write-ahead logging (WAL) on disk. However, in banking and card acquiring environments governed by PCI-DSS v4.0 and CNBV regulations, writing un-authorized cardholder data to disk creates severe regulatory liability.

## Decision
We adopt a strict **Fail-Safe / Fail-Secure** operational philosophy:
1. In the event of an unrecoverable crash, power loss, or OS process termination, volatile DRAM charges dissipate naturally.
2. No recovery file, cache, or journal is written to non-volatile storage.
3. From a financial standpoint, any transaction that was trapped in volatile RAM and not confirmed by the backend via HTTP 200 is treated as **Not Initiated / Voided**.
4. To prevent double-charging if the payload did reach the backend before client-side power loss, the backend enforces atomic Redis distributed idempotency keys (`SET NX EX 900`). The client UI reboots into a clean, uninitialized state and prompts the operator to re-authenticate and verify the status of the last transaction via an idempotent inquiry.

## Consequences
### Positive
* Zero disk residue under sudden termination, eliminating compliance exposure.
* Deterministic state recovery without complex corruption repair routines on local databases.
* Perfect idempotency guarantee preventing duplicate transaction settlement.

### Negative / Trade-offs
* A merchant terminal that loses power while offline will lose queued transactions that had not yet synchronized. 
* Merchants must be trained that transactions pending synchronization are bounded by the 15-minute MTPD window and require connectivity to settle.
