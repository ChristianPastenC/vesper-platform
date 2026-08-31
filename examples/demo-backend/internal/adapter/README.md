# Adapter Layer (`internal/adapter`)

The external integrations layer.

## Purpose
Implements outbound port interfaces for communicating with third-party services, APIs, and infrastructure-level tools.

## Files & Directories

| File/Directory | Description |
| :--- | :--- |
| **`auth/token_service.go`** | Handles the cryptographic generation, parsing, and validation of JWTs using ECDSA P-256 private keys. Implements `domain.TokenService`. |
| **`auth/inmemory_user_repository.go`** | Provides an in-memory implementation for user data storage. |
| **`client/mock_payment_gateway.go`** | A simulated implementation of the external `PaymentGateway` processor (similar to Stripe or Square). It validates card details and generates transaction receipts without hitting a real financial processor during development. |
| **`client/fakestore_gateway.go`** | Integrates with the FakeStore API to retrieve product and catalog data. |
