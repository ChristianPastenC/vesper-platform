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

// @title Sovereign Core Platform API
// @version 1.0
// @description Zero-trust backend API for Sovereign Core Platform.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@sovereign-core.local

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
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
		logger.Warn("PAYLOAD_SECRET_KEY is not set — HashValidator will reject all POST requests")
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
		logger.Warn("ECDSA_PRIVATE_KEY_PEM not set — generated ephemeral key. Set this env var to persist sessions across restarts.", "key", encodedKey)
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
