# Vesper Platform - Backend API

Welcome to the Backend API for the Vesper Platform. This service is built in Go (Golang) and designed under a strict **Zero-Trust Architecture**.

## API Architecture

The API follows Clean Architecture principles, divided into discrete layers to maintain decoupling and high cohesion:

- **Domain (`internal/domain`):** The core business logic. Contains the interfaces and data structures (Entities) that model the system, with zero external dependencies.
- **Usecase (`internal/usecase`):** The application logic layer. Contains the business rules (such as blockchain validation) and entity interactions.
- **Handler / Transport (`internal/handler`):** Manages incoming HTTP requests, JSON parsing, security middlewares, and communication with the web/mobile client.
- **Adapters (`internal/adapter` and `internal/store`):** Concrete technological implementations (BoltDB databases, external integrations, cryptography services).
- **Entrypoint (`cmd`):** Application startup point and dependency injection wiring.

> [!NOTE]
> For more details on each layer, refer to the `README.md` file inside each respective subfolder.

## Local Development

To run this backend in your local environment, ensure you have Go 1.22+ installed.

1. **Environment Variables**: Rename `.env.example` to `.env` (if it does not already exist) in the root of `examples/demo-backend`.
2. **Dependencies**: Install the required packages by running:
   ```bash
   go mod tidy
   ```
3. **Run the Server**:
   ```bash
   go run cmd/server/main.go
   ```
   The server will start on the configured port (default `8080`).

## Configured Commands & Tools

- **Generate Swagger Documentation:**
  ```bash
  swag init -g cmd/server/main.go
  ```
- **Clean and format modules:**
  ```bash
  go mod tidy
  ```
- **Run Tests (Integration & Unit):**
  ```bash
  go test ./...
  ```

## API Documentation (Swagger UI)

The API features an integrated Swagger UI. Once the server is running, you can visit:
**http://localhost:8080/swagger/index.html**

## Development Security Bypasses & Tools

Special environment variables are provided to allow seamless local testing (e.g., using Bruno/Postman) without triggering strict cryptographic security blocks:
- `BUILD_ENV=development`: Enables development-only routes, such as the `POST /api/v1/dev/dpop-token` endpoint which generates valid DPoP tokens automatically for API clients.
- `DEV_DPOP_BYPASS=true`: Bypasses the ECDSA signature verification (DPoP).
- `DEV_HASH_BYPASS=true`: Bypasses payload integrity verification (HMAC-SHA256).

> [!WARNING]
> These variables must never be injected or present in a production environment.
