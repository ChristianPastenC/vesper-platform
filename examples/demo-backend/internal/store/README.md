# Store Layer (`internal/store`)

The persistence and database adapter layer.

## Purpose
Implements the repository interfaces defined in the Domain layer to interact with the database.

## Files

- **`db.go`**: Initializes, configures, and manages the connection to BoltDB (an embedded key-value store).
- **`bolt_user_repository.go`**: Persists user credentials, profile data, and handles user querying.
- **`bolt_order_repository.go`**: Persists processed orders and immutable offline ledger chains to the database.
- **`bolt_refresh_token_repository.go`**: Manages the storage and invalidation of refresh tokens for secure sessions.
- **`*_test.go`**: Unit tests verifying the persistence and retrieval of records from BoltDB.
