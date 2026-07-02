package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"sovereign-core/telemetry-api/internal/adapter/db"
	"sovereign-core/telemetry-api/internal/adapter/telemetry"
	myhttp "sovereign-core/telemetry-api/internal/handler/http"
	"sovereign-core/telemetry-api/internal/middleware"

	"github.com/go-chi/chi/v5"
	chi_middleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	r := chi.NewRouter()
	
	// Basic standard middlewares
	r.Use(chi_middleware.RequestID)
	r.Use(chi_middleware.RealIP)
	r.Use(chi_middleware.Logger)
	r.Use(chi_middleware.Recoverer)

	// Basic CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4321", "http://127.0.0.1:4321"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Sovereign-API-Key"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Init DB
	sqliteRepo, err := db.NewSQLiteRepository(logger, "telemetry.db")
	if err != nil {
		logger.Error("Failed to init SQLite", "error", err)
		os.Exit(1)
	}

	authHandler := myhttp.NewAuthHandler(logger, sqliteRepo)

	// B2B SaaS Auth Endpoints
	r.Post("/api/v1/b2b/login", authHandler.Login)
	r.Post("/api/v1/b2b/keys", authHandler.CreateKey)
	r.Get("/api/v1/b2b/keys", authHandler.ListKeys)

	// Middleware for ingestion
	ingestRouter := chi.NewRouter()
	ingestRouter.Use(middleware.ApiKeyValidator(sqliteRepo))
	// Zero-Trust Data Sanitizer
	ingestRouter.Use(middleware.LogSanitizer)

	otelClient, err := telemetry.NewOtelClient(logger)
	if err != nil {
		logger.Error("Failed to initialize OpenTelemetry client, telemetry will be disabled", "error", err)
	} else {
		defer otelClient.Shutdown(context.Background())
		telemetryHandler := myhttp.NewTelemetryHandler(logger, otelClient)
		ingestRouter.Post("/", telemetryHandler.Ingest)
		r.Mount("/api/v1/support/telemetry", ingestRouter)
	}

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
