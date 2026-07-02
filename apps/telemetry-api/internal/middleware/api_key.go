package middleware

import (
	"context"
	"net/http"

	"sovereign-core/telemetry-api/internal/domain"
)

type contextKey string

const TenantIDKey contextKey = "tenant_id"

// ApiKeyValidator intercepts requests and requires a valid X-Sovereign-API-Key header.
func ApiKeyValidator(repo domain.AuthRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-Sovereign-API-Key")

			if apiKey == "" {
				http.Error(w, "Missing X-Sovereign-API-Key header", http.StatusUnauthorized)
				return
			}

			keyRec, err := repo.ValidateApiKey(r.Context(), apiKey)
			if err != nil || keyRec == nil {
				http.Error(w, "Invalid API Key", http.StatusForbidden)
				return
			}

			// Inject TenantID into request context so downstream handlers can tag the metrics
			ctx := context.WithValue(r.Context(), TenantIDKey, keyRec.TenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
