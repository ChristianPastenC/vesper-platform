// SovereignCore Backend API — Cryptographic Validation Server
//
// Entry point. Wires the HTTP mux, CORS middleware, structured logger,
// and challenge issuer together into a single runnable binary.
// Only the Go standard library is used; no third-party dependencies.
package main

import (
	"context"
	"crypto/rand"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sovereign-core/backend-api/internal/challenge"
	"sovereign-core/backend-api/internal/handlers"
	"sovereign-core/backend-api/internal/middleware"
)

func main() {
	// ─── Structured logger ────────────────────────────────────────────────────
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(log)

	// ─── Challenge issuer ─────────────────────────────────────────────────────
	// In production, load the secret from an environment variable or secret
	// manager. We fall back to a random ephemeral key so the server is always
	// runnable without configuration — tokens do not survive restarts.
	secret := loadOrGenerateSecret(log)
	ttl := 2 * time.Minute
	issuer := challenge.NewIssuer(secret, ttl)

	// ─── CORS policy ──────────────────────────────────────────────────────────
	corsCfg := middleware.DefaultCORSConfig()
	// Override from environment for Docker / CI deployments.
	if origin := os.Getenv("CORS_ALLOWED_ORIGIN"); origin != "" {
		corsCfg.AllowedOrigins = []string{origin}
		log.Info("CORS origin overridden from environment", "origin", origin)
	}

	// ─── Router ───────────────────────────────────────────────────────────────
	mux := http.NewServeMux()
	mux.Handle("/api/handshake", handlers.HandshakeHandler(issuer, log))
	mux.Handle("/health", handlers.HealthHandler())

	// ─── Server ───────────────────────────────────────────────────────────────
	addr := ":8080"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	srv := &http.Server{
		Addr:         addr,
		Handler:      middleware.CORS(corsCfg)(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// ─── Graceful shutdown ────────────────────────────────────────────────────
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info("SovereignCore backend-api listening",
			"addr", addr,
			"challenge_ttl", ttl.String(),
		)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-stop
	log.Info("shutdown signal received — draining connections")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error("graceful shutdown failed", "err", err)
		os.Exit(1)
	}

	log.Info("server stopped cleanly")
}

// loadOrGenerateSecret returns the HMAC signing secret for the challenge issuer.
// Priority:  CHALLENGE_SECRET env var  →  random 32-byte ephemeral key.
func loadOrGenerateSecret(log *slog.Logger) []byte {
	if s := os.Getenv("CHALLENGE_SECRET"); s != "" {
		if len(s) < 32 {
			log.Warn("CHALLENGE_SECRET is shorter than 32 bytes — consider using a longer secret")
		}
		return []byte(s)
	}

	log.Warn("CHALLENGE_SECRET not set — generating ephemeral key (tokens will not survive restarts)")

	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		log.Error("failed to generate ephemeral secret", "err", err)
		os.Exit(1)
	}
	return key
}