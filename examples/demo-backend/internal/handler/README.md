# Handler Layer (`internal/handler`)

The transport and presentation layer of the API.

## Purpose
Responsible for exposing HTTP endpoints, parsing incoming requests, managing the router, and enforcing HTTP-level security.

## Structure & Files

### `http/`
Contains all REST route handlers and the central router.
- **`router.go`**: The central `chi` Router configuration that wires all endpoints, handlers, and middlewares together. Exposes the Swagger UI.
- **`auth_handler.go`**: Endpoints for user registration, login, and token refreshing.
- **`catalog_handler.go`**: Endpoints for retrieving product catalog data.
- **`dev_handler.go`**: Development endpoints for simulating or testing specific logic.
- **`orders_handler.go`**: Endpoints for fetching user orders.
- **`payment_handler.go`**: Endpoints for processing online payments and syncing offline transactions.
- **`profile_handler.go`**: Endpoints for fetching and updating user profiles.
- **`stores_handler.go`**: Endpoints for store locations.
- **`helpers.go`**: Utility functions for consistent JSON serialization and HTTP error formatting.
- **`checkout_integration_test.go`**: Integration tests that simulate the full checkout flow including DPoP generation.

### `middleware/`
Contains the Zero-Trust security interceptors.
- **`cors.go`**: Global CORS configuration allowing specific security headers.
- **`dpop_auth.go`**: Validates ECDSA DPoP signatures to prevent token theft.
- **`hash_validator.go`**: Validates the `X-Sovereign-Hash` header using HMAC-SHA256 to ensure payload integrity.
- **`idempotency.go`**: Prevents replay attacks and duplicate processing by caching recent transaction states.
- **`jwt_auth.go`**: Validates JWT structure, claims, and expiration.
- **`rate_limiter.go`**: Enforces strict traffic and burst limits on public and protected routes to prevent DDoS attacks.
