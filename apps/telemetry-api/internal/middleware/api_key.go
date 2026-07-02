package middleware

import (
	"context"
	"net/http"
)

type contextKey string

const TenantIDKey contextKey = "tenant_id"

// Dummy store of valid API Keys mapping to Tenant IDs for demonstration purposes.
// In a production environment, this would hit Redis or PostgreSQL (VictoriaMetrics metadata).
var validApiKeys = map[string]string{
	"sk_test_1234567890abcdef": "tenant_alpha_001",
	"sk_live_0987654321fedcba": "tenant_beta_002",
}

// ApiKeyValidator intercepts requests and requires a valid X-Sovereign-API-Key header.
func ApiKeyValidator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-Sovereign-API-Key")

		if apiKey == "" {
			http.Error(w, "Missing X-Sovereign-API-Key header", http.StatusUnauthorized)
			return
		}

		tenantID, exists := validApiKeys[apiKey]
		if !exists {
			http.Error(w, "Invalid API Key", http.StatusForbidden)
			return
		}

		// Inject TenantID into request context so downstream handlers can tag the metrics
		ctx := context.WithValue(r.Context(), TenantIDKey, tenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
