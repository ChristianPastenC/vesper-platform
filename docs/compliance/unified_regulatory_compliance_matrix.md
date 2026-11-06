# Unified Regulatory Compliance Matrix (PCI-DSS, DORA, CNBV, ISO 22301)

| Regulatory Framework | Article / Section | Mandatory Control Summary | Architecture Component | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **PCI-DSS v4.0** | **Req. 3.2** | Do not retain Sensitive Authentication Data (SAD) after authorization. | `packages/ghost-ledger/cpp/VolatileQueue.hpp` | Zero-Disk memory model; static grep audit proving zero disk writes. |
| **PCI-DSS v4.0** | **Req. 3.4** | Render PAN unreadable anywhere it is stored. | `packages/ghost-ledger/cpp/CryptoUtils.h` | Active zeroization (`memset_s` + inline assembly barrier); memory locking via `mlock`. |
| **DORA (EU 2022/2554)** | **Art. 6 & 9** | ICT Risk Management & Protection Mechanisms. | `examples/demo-backend/internal/handler/middleware/dpop_auth.go` | DPoP signature verification (RFC 9449) and payload HMAC validation. |
| **DORA (EU 2022/2554)** | **Art. 11 & 12** | ICT Business Continuity & Response/Recovery. | `docs/business_context_bia.md`<br>`packages/ghost-ledger` | Formal BIA metrics ($\text{MTPD} = 900\text{ s}$, $\text{RTO} < 100\text{ ms}$, $\text{RPO} = 0\text{ s}$). |
| **DORA (EU 2022/2554)** | **Art. 26** | Threat-Led Penetration Testing (TLPT). | `.github/workflows/demo-mobile-ci.yml` | Headless Android KVM emulator executing dynamic Frida hooking in CI. |
| **CNBV (CUB)** | **Art. 163 bis** | Integridad y autenticidad en canales de banca electrónica móvil. | `packages/ghost-ledger/src/dpop` | Claves efímeras ECDSA P-256 ancladas en enclave de hardware (StrongBox/Secure Enclave). |
| **CNBV (CUB)** | **Anexo 52** | Prevención de transacciones duplicadas por fallas de conexión. | `examples/demo-backend/internal/adapter/db/redis_idempotency.go` | Bloqueo distribuido atómico en Redis (`SET NX EX 900`). |
| **ISO 22301:2019** | **Clause 8.2.2** | Business Impact Analysis (BIA) formalization. | `docs/business_context_bia.md` | Cuantificación formal de pérdidas operativas, curvas de decaimiento y tiering de servicios. |
| **ISO 22301:2019** | **Clause 8.4** | Business Continuity Procedures & Runbooks. | `docs/operational_resilience/bcp_drp_runbook.md` | Procedimientos operativos estándar de secuestro de peticiones y reconciliación. |
