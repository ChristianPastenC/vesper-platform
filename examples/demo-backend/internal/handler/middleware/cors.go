package middleware

import (
	"net/http"
	"os"
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

// DefaultCORSConfig returns a configuration suitable for local development and authorized Netlify frontends.
func DefaultCORSConfig() CORSConfig {
	origins := []string{
		"http://localhost:3000",
		"http://localhost:4000",
		"http://localhost:8081",
		"http://localhost:8082",
		"http://localhost:19006",
		"https://vesper-console.netlify.app",
		"*",
	}
	if extra := os.Getenv("ALLOWED_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			if trimmed := strings.TrimSpace(o); trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}

	return CORSConfig{
		AllowedOrigins: origins,
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{
			"Content-Type",
			"Authorization",
			"DPoP",
			"X-Challenge-Token",
			"X-Request-ID",
			"X-Client-Version",
			"X-Idempotency-Key",
			"X-Sovereign-Hash",
		},
		ExposedHeaders:   []string{"X-Challenge-ID", "X-Challenge-Expires", "DPoP-Nonce"},
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
				if isAllowedOrigin(allowedOriginSet, origin, cfg.AllowCredentials) {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Add("Vary", "Origin")

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
				} else {
					if r.Method == http.MethodOptions {
						w.WriteHeader(http.StatusForbidden)
						return
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isAllowedOrigin(allowed map[string]struct{}, origin string, allowCredentials bool) bool {
	if !allowCredentials {
		if _, ok := allowed["*"]; ok {
			return true
		}
	}
	if _, ok := allowed[origin]; ok {
		return true
	}
	if strings.HasPrefix(origin, "https://") && strings.HasSuffix(origin, ".netlify.app") {
		return true
	}
	return false
}
