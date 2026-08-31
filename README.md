# Vesper Core Platform

This repository contains the Vesper Developer Platform, a B2B SaaS system that provides a portal and an ingestion API for the Vesper Client SDK telemetry data.

## Architecture

The project is structured as a monorepo containing two main applications:

1. **`vesper-ingestion`** (Backend - Go)
   - A high-performance Go HTTP server using `go-chi`.
   - Exposes REST endpoints for the B2B SaaS authentication and API Key generation.
   - Exposes a binary ingestion endpoint (`/api/v1/support/telemetry`) that receives compressed telemetry data from client SDKs.
   - Implements Zero-Trust Log Sanitization middleware to scrub any accidental PII via Regex before processing.
   - Forwards telemetry to an OpenTelemetry collector (like VictoriaMetrics) and stores a local copy in SQLite for the real-time developer dashboard.

2. **`vesper-console`** (Frontend - Astro)
   - A lightweight, ultra-fast frontend built entirely in Astro and Vanilla JS.
   - Provides authentication (Login/Signup) for tenant organizations.
   - Allows developers to generate API Keys (`X-Sovereign-API-Key`) to embed in their `SovereignClientCore` implementations.
   - Features a real-time dashboard using `Chart.js` that visualizes the telemetry metrics (Integrity & Latency) ingested by the backend.

## Getting Started

### 1. Run the Telemetry API Backend
```bash
cd apps/vesper-ingestion
go mod download
go run ./cmd/server
```
*The server will run on `http://127.0.0.1:8081`.*
*SQLite database `telemetry.db` will be automatically generated and seeded.*

### 2. Run the B2B Portal
```bash
cd apps/vesper-console
npm install
npm run dev
```
*The portal will run on `http://localhost:4000` (port fixed in `package.json`, not Astro's default 4321).*

## Database Management
To clear the SQLite database and start fresh:
```bash
cd apps/vesper-ingestion
go run ./cmd/cli clean-db
```

## API Testing with Bruno

This repository includes a native [Bruno](https://www.usebruno.com/) collection for API testing:
- **`bruno/demo-backend/`**: Contains the E-Commerce backend endpoints (if applicable).
- **`bruno/vesper-ingestion/`**: Contains the B2B Auth and Ingestion endpoints. Ensure you select the `Local` environment in Bruno so the `{{base_url}}` points to `http://127.0.0.1:8081`.

### Endpoints overview
- `POST /api/v1/b2b/signup`: Register new tenant
- `POST /api/v1/b2b/login`: Authenticate
- `POST /api/v1/b2b/keys`: Generate SDK key
- `GET /api/v1/b2b/keys`: List keys
- `DELETE /api/v1/b2b/keys`: Delete an SDK key
- `GET /api/v1/b2b/metrics`: Real-time data for the chart
- `GET /api/v1/support/ping`: Health check
- `POST /api/v1/support/telemetry`: SDK Binary ingestion
