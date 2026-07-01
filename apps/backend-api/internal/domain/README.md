# Domain Layer (`internal/domain`)

The innermost layer of the application.

## Purpose
Contains the core business entities, interfaces, and rules that govern the platform.

## Rules
- **No external dependencies**: This layer must not import anything from `usecase`, `handler`, `store`, or external libraries.
- All entities (like `User`, `TransactionBlock`, `Order`) and port interfaces (`TokenService`, `PaymentGateway`, `UserRepository`) are defined here.

## Files

- **`auth.go`**: Defines user authentication structures, credentials, and JWT claims. Includes `TokenService` and `RefreshTokenRepository` interfaces.
- **`order.go`**: Defines the `Order` struct, `OrderItem`, and `OrderTimelineEvent` for tracking an order's lifecycle. Includes `OrderRepository` interface.
- **`payment.go`**: Defines `PaymentIntent`, `CardDetails`, and the cryptographic `TransactionBlock`. Includes the `PaymentGateway` interface.
- **`product.go`**: Defines `Product` and `Rating` entities for the platform's catalog.
