package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"sovereign-core/telemetry-api/internal/adapter/telemetry"
	myhttp "sovereign-core/telemetry-api/internal/handler/http"
	"sovereign-core/telemetry-api/internal/middleware"

	"github.com/go-chi/chi/v5"
	chi_middleware "github.com/go-chi/chi/v5/middleware"
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
	
	// B2B SaaS Auth
	r.Use(middleware.ApiKeyValidator)
	// Zero-Trust Data Sanitizer
	r.Use(middleware.LogSanitizer)

	otelClient, err := telemetry.NewOtelClient(logger)
	if err != nil {
		logger.Error("Failed to initialize OpenTelemetry client, telemetry will be disabled", "error", err)
	} else {
		defer otelClient.Shutdown(context.Background())
		telemetryHandler := myhttp.NewTelemetryHandler(logger, otelClient)
		r.Post("/api/v1/support/telemetry", telemetryHandler.Ingest)
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
