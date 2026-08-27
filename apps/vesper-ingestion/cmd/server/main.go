package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"vesper-core/vesper-ingestion/internal/adapter/db"
	"vesper-core/vesper-ingestion/internal/adapter/telemetry"
	"vesper-core/vesper-ingestion/internal/domain"
	myhttp "vesper-core/vesper-ingestion/internal/handler/http"
	"vesper-core/vesper-ingestion/internal/middleware"

	"github.com/go-chi/chi/v5"
	chi_middleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	_ "vesper-core/vesper-ingestion/docs" // Swagger docs
	httpSwagger "github.com/swaggo/http-swagger"
)

// @title Vesper Ingestion API
// @version 1.0
// @description This API represents the core of the V.E.S.P.E.R. platform. Its main purpose is to provide B2B authentication services and high-security, low-latency telemetry collection. Unlike traditional JSON-based APIs, the telemetry endpoint uses a low-level approach to maximize efficiency and security at the Edge. The API expects a pure binary stream (application/octet-stream) with strict memory alignment (exactly 17 bytes per event).
// @BasePath /
func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	r := chi.NewRouter()
	
	// Basic standard middlewares
	r.Use(chi_middleware.RequestID)
	r.Use(chi_middleware.RealIP)
	r.Use(chi_middleware.Logger)
	r.Use(chi_middleware.Recoverer)

	// Strict CORS for production, with fallback for local dev
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			allowed := os.Getenv("ALLOWED_ORIGINS")
			if allowed == "*" || allowed == "" {
				return origin == "http://localhost:4000" || origin == "http://127.0.0.1:4000" || origin == "http://localhost:3000"
			}
			return origin == allowed
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Vesper-API-Key", "Origin", "X-Sovereign-Session-Key", "X-Sovereign-IV"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Init DB
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "telemetry.db"
	}
	sqliteRepo, err := db.NewSQLiteRepository(logger, dbPath)
	if err != nil {
		logger.Error("Failed to init SQLite", "error", err)
		os.Exit(1)
	}

	authHandler := myhttp.NewAuthHandler(logger, sqliteRepo)

	// ── JSON / text endpoints — apply PII sanitizer ──────────────────────────
	// LogSanitizer runs regex substitutions on the request body. It is ONLY
	// safe for text-based (JSON) payloads. Never mount it on binary streams.
	authRouter := chi.NewRouter()
	authRouter.Use(middleware.LogSanitizer)
	authRouter.Post("/login", authHandler.Login)
	authRouter.Post("/signup", authHandler.Register)
	authRouter.Post("/keys", authHandler.CreateKey)
	authRouter.Get("/keys", authHandler.ListKeys)
	authRouter.Delete("/keys", authHandler.DeleteKey)
	authRouter.Get("/metrics", authHandler.GetMetrics)
	r.Mount("/api/v1/b2b", authRouter)

	r.Get("/api/v1/support/ping", authHandler.Ping)

	// Swagger UI
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/swagger/index.html", http.StatusTemporaryRedirect)
	})

	// ── Binary telemetry ingestion — NO text sanitizer ────────────────────────
	// The mobile SDK emits a raw binary stream (application/octet-stream, 17 bytes
	// per event, XOR-encrypted). Applying regex-based sanitization here would
	// corrupt the binary payload and make XOR decoding produce garbage values.
	ingestRouter := chi.NewRouter()
	ingestRouter.Use(middleware.ApiKeyValidator(sqliteRepo))
	// LogSanitizer is intentionally NOT mounted here — binary stream only.

	var forwarder domain.TelemetryForwarder
	otelClient, err := telemetry.NewOtelClient(logger)
	if err != nil {
		logger.Warn("OpenTelemetry collector unavailable — events will be stored locally in SQLite only", "error", err)
		forwarder = &telemetry.NoopForwarder{}
	} else {
		defer otelClient.Shutdown(context.Background())
		forwarder = otelClient
	}
	telemetryHandler := myhttp.NewTelemetryHandler(logger, forwarder, sqliteRepo)
	ingestRouter.Post("/", telemetryHandler.Ingest)
	r.Mount("/api/v1/support/telemetry", ingestRouter)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	srv := &http.Server{
		Addr:         ":8081", // Running on different port than backend-api (which uses 8080)
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	logger.Info("Starting Telemetry API server", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("Server failed", "error", err)
		os.Exit(1)
	}
}
