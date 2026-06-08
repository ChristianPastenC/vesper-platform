package middleware

import (
	"net/http"
	"strings"
)

// CORSConfig holds the policy settings applied by the CORS middleware.
type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           string
}

// DefaultCORSConfig returns a configuration suitable for local development.
func DefaultCORSConfig() CORSConfig {
	return CORSConfig{
		AllowedOrigins: []string{"http://localhost:3000", "http://localhost:8081", "*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{
			"Content-Type",
			"Authorization",
			"DPoP",
			"X-Challenge-Token",
			"X-Request-ID",
			"X-Client-Version",
		},
		ExposedHeaders:   []string{"X-Challenge-ID", "X-Challenge-Expires"},
		AllowCredentials: true,
		MaxAge:           "600",
	}
}

// CORS returns an HTTP middleware that enforces the supplied CORSConfig policy.
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

			if origin != "" {
				if isAllowedOrigin(allowedOriginSet, origin) {
					w.Header().Set("Access-Control-Allow-Origin", origin)
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

				if r.Method == http.MethodOptions {
					w.Header().Set("Access-Control-Max-Age", cfg.MaxAge)
					w.WriteHeader(http.StatusNoContent)
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isAllowedOrigin(allowed map[string]struct{}, origin string) bool {
	if _, ok := allowed["*"]; ok {
		return true
	}
	_, ok := allowed[origin]
	return ok
}
