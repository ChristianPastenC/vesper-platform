package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	"vesper-core/demo-backend/internal/adapter/auth"
	"vesper-core/demo-backend/internal/adapter/client"
	"vesper-core/demo-backend/internal/challenge"
	myhttp "vesper-core/demo-backend/internal/handler/http"
	"vesper-core/demo-backend/internal/handler/middleware"
	"vesper-core/demo-backend/internal/store"
	"vesper-core/demo-backend/internal/usecase"
)

// @title Demo Customer Backend API
// @version 1.0
// @description # Vesper Platform - Backend API
//
// Welcome to the Backend API for the Vesper Platform. This service is built in Go (Golang) and designed under a strict **Zero-Trust Architecture**.
//
// ## API Architecture
//
// The API follows Clean Architecture principles, divided into discrete layers to maintain decoupling and high cohesion:
//
// - **Domain (`internal/domain`):** The core business logic. Contains the interfaces and data structures (Entities) that model the system, with zero external dependencies.
// - **Usecase (`internal/usecase`):** The application logic layer. Contains the business rules (such as blockchain validation) and entity interactions.
// - **Handler / Transport (`internal/handler`):** Manages incoming HTTP requests, JSON parsing, security middlewares, and communication with the web/mobile client.
// - **Adapters (`internal/adapter` and `internal/store`):** Concrete technological implementations (BoltDB databases, external integrations, cryptography services).
// - **Entrypoint (`cmd`):** Application startup point and dependency injection wiring.
//
// > **For more details on each layer, refer to the `README.md` file inside each respective subfolder.**
//
// ## Local Development
//
// To run this backend in your local environment, ensure you have Go 1.22+ installed.
//
//  1. **Environment Variables**: Rename `.env.example` to `.env` (if it does not already exist) in the root of `examples/demo-backend`.
//  2. **Dependencies**: Install the required packages by running:
//     ```bash
//     go mod tidy
//     ```
//  3. **Run the Server**:
//     ```bash
//     go run cmd/server/main.go
//     ```
//     The server will start on the configured port (default `8080`).
//
// ## Configured Commands & Tools
//
//   - **Generate Swagger Documentation:**
//     ```bash
//     swag init -g internal/handler/http/router.go
//     ```
//   - **Clean and format modules:**
//     ```bash
//     go mod tidy
//     ```
//   - **Run Tests (Integration & Unit):**
//     ```bash
//     go test ./...
//     ```
//
// ## Development Security Bypasses & Tools
//
// Special environment variables are provided to allow seamless local testing (e.g., using Bruno/Postman) without triggering strict cryptographic security blocks:
// - `BUILD_ENV=development`: Enables development-only routes, such as the `POST /api/v1/dev/dpop-token` endpoint which generates valid DPoP tokens automatically for API clients.
// - `DEV_DPOP_BYPASS=true`: Bypasses the ECDSA signature verification (DPoP).
// - `DEV_HASH_BYPASS=true`: Bypasses payload integrity verification (HMAC-SHA256).
//
// > **Warning:** These variables must never be injected or present in a production environment.
// 
// ### âš ï¸ Important Note about Bruno/Postman in Production
// 
// Because this API implements a strict Zero-Trust architecture with cryptographic validations, **you cannot easily test the production endpoints using standard tools like Bruno or Postman**. Every request modifying data requires dynamically generated DPoP (Demonstrating Proof-of-Possession) ECDSA signatures and HMAC-SHA256 payload integrity headers. Without the C++ SDK or complex pre-request scripts to compute these cryptographic signatures, your requests will be rejected by the API.
//

// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Attempt to load .env file; it's fine if it fails in production where env vars are injected
	_ = godotenv.Load()

	if os.Getenv("PAYLOAD_SECRET_KEY") == "" {
		logger.Warn("PAYLOAD_SECRET_KEY is not set â€” HashValidator will reject all POST requests")
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/sovereign.db"
	}
	db, err := store.OpenDB(dbPath)
	if err != nil {
		logger.Error("Failed to open BoltDB", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// 2. Initialize buckets
	if err := store.InitBuckets(db); err != nil {
		logger.Error("Failed to initialize buckets", "error", err)
		os.Exit(1)
	}

	// 3. Repositories
	userRepo := store.NewBoltUserRepository(db)
	orderRepo := store.NewBoltOrderRepository(db)
	tokenRepo := store.NewBoltRefreshTokenRepository(db)

	var privateKey *ecdsa.PrivateKey
	pemB64 := os.Getenv("ECDSA_PRIVATE_KEY_PEM")
	if pemB64 != "" {
		pemBytes, err := base64.RawURLEncoding.DecodeString(pemB64)
		if err == nil {
			if pk, err := x509.ParseECPrivateKey(pemBytes); err == nil {
				privateKey = pk
			}
		}
	}

	if privateKey == nil {
		privateKey, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if err != nil {
			logger.Error("Failed to generate ECDSA key pair", "error", err)
			os.Exit(1)
		}
		derBytes, _ := x509.MarshalECPrivateKey(privateKey)
		encodedKey := base64.RawURLEncoding.EncodeToString(derBytes)
		logger.Warn("ECDSA_PRIVATE_KEY_PEM not set â€” generated ephemeral key. Set this env var to persist sessions across restarts.", "key", encodedKey)
	}
	tokenSvc := auth.NewEcdsaTokenService(privateKey, &privateKey.PublicKey, 15*time.Minute, userRepo, tokenRepo)

	fakeStoreGW := client.NewFakeStoreGateway()
	mockGW := client.NewMockPaymentGateway()

	authInteractor := usecase.NewAuthInteractor(userRepo, tokenSvc)
	catalogInteractor := usecase.NewCatalogInteractor(fakeStoreGW)
	paymentInteractor := usecase.NewPaymentInteractor(mockGW, orderRepo)

	idempMgr := middleware.NewIdempotencyManager()

	// Handlers
	authHandler := myhttp.NewAuthHandler(authInteractor)
	catalogHandler := myhttp.NewCatalogHandler(catalogInteractor)
	paymentHandler := myhttp.NewPaymentHandler(paymentInteractor, idempMgr)
	profileHandler := myhttp.NewProfileHandler(userRepo)
	ordersHandler := myhttp.NewOrdersHandler(orderRepo)
	storesHandler := myhttp.NewStoresHandler()

	issuer := challenge.NewIssuer([]byte("test-challenge-key"), 5*time.Minute)

	routerConfig := myhttp.RouterConfig{
		Log:                logger,
		ChallengeIssuer:    issuer,
		TokenService:       tokenSvc,
		AuthHandler:        authHandler,
		CatalogHandler:     catalogHandler,
		PaymentHandler:     paymentHandler,
		ProfileHandler:     profileHandler,
		OrdersHandler:      ordersHandler,
		StoresHandler:      storesHandler,
		IdempotencyManager: idempMgr,
	}

	router := myhttp.NewRouter(routerConfig)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info("Starting server", "port", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
