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

	// Permissive CORS for local dev
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Vesper-API-Key", "Origin"},
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

	// B2B SaaS Auth Endpoints
	r.Post("/api/v1/b2b/login", authHandler.Login)
	r.Post("/api/v1/b2b/signup", authHandler.Register)
	r.Post("/api/v1/b2b/keys", authHandler.CreateKey)
	r.Get("/api/v1/b2b/keys", authHandler.ListKeys)
	r.Delete("/api/v1/b2b/keys", authHandler.DeleteKey)
	r.Get("/api/v1/b2b/metrics", authHandler.GetMetrics)
	r.Get("/api/v1/support/ping", authHandler.Ping)

	// Swagger UI
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/swagger/index.html", http.StatusTemporaryRedirect)
	})

	// Middleware for ingestion
	ingestRouter := chi.NewRouter()
	ingestRouter.Use(middleware.ApiKeyValidator(sqliteRepo))
	// Zero-Trust Data Sanitizer
	ingestRouter.Use(middleware.LogSanitizer)

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
