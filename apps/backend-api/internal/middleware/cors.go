// Package middleware provides reusable HTTP middleware for the SovereignCore backend API.
package middleware

import (
	"net/http"
	"strings"
)

// CORSConfig holds the policy settings applied by the CORS middleware.
type CORSConfig struct {
	// AllowedOrigins is the set of origins permitted to cross-origin request this server.
	// Use ["*"] only in development; production should list explicit origins.
	AllowedOrigins []string

	// AllowedMethods lists the HTTP methods the browser is allowed to use in CORS requests.
	AllowedMethods []string

	// AllowedHeaders lists the request headers clients may include.
	AllowedHeaders []string

	// ExposedHeaders lists the response headers the browser is allowed to read.
	ExposedHeaders []string

	// AllowCredentials controls whether cookies / auth headers are forwarded.
	AllowCredentials bool

	// MaxAge is the preflight cache duration in seconds (sent in Access-Control-Max-Age).
	MaxAge string
}

// DefaultCORSConfig returns a safe default configuration suitable for local development.
// Callers should override AllowedOrigins before using this in production.
func DefaultCORSConfig() CORSConfig {
	return CORSConfig{
		AllowedOrigins: []string{"http://localhost:3000", "http://localhost:8081"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{
			"Content-Type",
			"Authorization",
			"X-Request-ID",
			"X-Client-Version",
		},
		ExposedHeaders:   []string{"X-Challenge-ID", "X-Challenge-Expires"},
		AllowCredentials: false,
		MaxAge:           "600", // 10 minutes preflight cache
	}
}

// CORS returns an HTTP middleware that enforces the supplied CORSConfig policy.
// It handles OPTIONS preflight requests and injects the appropriate CORS response
// headers on every request that carries an Origin header.
func CORS(cfg CORSConfig) func(http.Handler) http.Handler {
	allowedOriginSet := make(map[string]struct{}, len(cfg.AllowedOrigins))
	for _, o := range cfg.AllowedOrigins {
		allowedOriginSet[o] = struct{}{}
	}

	joinedMethods := strings.Join(cfg.AllowedMethods, ", ")
	joinedHeaders := strings.Join(cfg.AllowedHeaders, ", ")
	joinedExposed := strings.Join(cfg.ExposedHeaders, ", ")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Only inject CORS headers when an Origin is present (i.e., a cross-origin request).
			if origin != "" {
				if isAllowedOrigin(allowedOriginSet, origin) {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					// Vary must be set so caches don't serve incorrect responses.
					w.Header().Add("Vary", "Origin")
				}

				w.Header().Set("Access-Control-Allow-Methods", joinedMethods)
				w.Header().Set("Access-Control-Allow-Headers", joinedHeaders)

				if joinedExposed != "" {
					w.Header().Set("Access-Control-Expose-Headers", joinedExposed)
				}

				if cfg.AllowCredentials {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}

				// Handle preflight (OPTIONS) requests and short-circuit the chain.
				if r.Method == http.MethodOptions {
					w.Header().Set("Access-Control-Max-Age", cfg.MaxAge)
					w.WriteHeader(http.StatusNoContent) // 204 — no body needed
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// isAllowedOrigin checks whether origin is in the allowed set.
// The wildcard string "*" permits any origin.
func isAllowedOrigin(allowed map[string]struct{}, origin string) bool {
	if _, ok := allowed["*"]; ok {
		return true
	}
	_, ok := allowed[origin]
	return ok
}
