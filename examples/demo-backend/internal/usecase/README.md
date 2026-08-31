# Usecase Layer (`internal/usecase`)

The application logic layer.

## Purpose
Implements the business use cases (Interactors). It orchestrates the flow of data between the Domain layer and the external Adapters/Stores.

## Files

| File | Description |
| :--- | :--- |
| **`auth_interactor.go`** | Orchestrates registration, login, and JWT generation workflows. |
| **`catalog_interactor.go`** | Handles the retrieval of product catalog data. |
| **`ledger_validator.go`** | Contains pure mathematical functions to validate the cryptographic chain of offline transaction blocks (`SHA256(Payload + PrecedingHash + Timestamp)`). |
| **`payment_interactor.go`** | Orchestrates both online payment processing and offline transaction synchronizations. It coordinates the `PaymentGateway` and `OrderRepository`. |
| **`*_test.go`** | Unit tests for the respective interactors, ensuring business logic rules are strictly enforced. |
