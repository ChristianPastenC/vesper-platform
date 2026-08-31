# Vesper Ingestion API

[![Ingestion API Deployment](https://img.shields.io/badge/Live_Deployment-Render-46E3B7?style=for-the-badge&logo=render)](https://vesper-ingestion.onrender.com/)

Welcome to the backend ingestion core for the Vesper Developer Platform. Built in **Go**, it handles high-throughput telemetry streams from mobile SDKs.

## 🚀 Live Environment

The production build of this API is continuously deployed on Render. You can interact with the live Swagger documentation here:
**[https://vesper-ingestion.onrender.com/swagger/index.html](https://vesper-ingestion.onrender.com/swagger/index.html)**

---

## Architecture & Features

- **Binary Telemetry Parsing**: Unlike traditional JSON APIs, the ingestion endpoint (`/api/v1/support/telemetry`) receives raw 17-byte XOR-encrypted binary payloads directly from the C++ SDK.
- **Zero-Trust Log Sanitization**: Uses Regex to scrub accidental PII from text-based requests before processing.
- **Embedded Database**: Uses SQLite natively for managing tenant accounts, API keys, and charting metrics without requiring an external DB cluster.
- **OpenTelemetry Export**: Conditionally exports parsed metrics to external collectors (like VictoriaMetrics) if available.

## Local Development

### Prerequisites
- Go 1.22+

### Running the Server

1. Navigate to the ingestion directory:
   ```bash
   cd apps/vesper-ingestion
   ```
2. Download Go modules:
   ```bash
   go mod download
   ```
3. Run the application:
   ```bash
   go run ./cmd/server
   ```

> [!TIP]
> The server will start on port `8081` (not `8080`) to avoid conflicting with the E-Commerce backend.

### Managing the Database

To reset the local SQLite database and re-seed the default tenants:
```bash
go run ./cmd/cli clean-db
```
