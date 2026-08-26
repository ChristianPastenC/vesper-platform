package middleware

import (
	"context"
	"net/http"

	"vesper-core/vesper-ingestion/internal/domain"
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

			// TOFU (Trust On First Use) for Bundle ID
			clientBundleID := r.Header.Get("X-Bundle-ID")
			if clientBundleID == "" {
				http.Error(w, "Missing X-Bundle-ID header", http.StatusBadRequest)
				return
			}

			if keyRec.BundleID == "" {
				// First Use: bind this Bundle ID permanently
				if err := repo.UpdateApiKeyBundleID(r.Context(), keyRec.Key, clientBundleID); err != nil {
					http.Error(w, "Failed to bind Bundle ID", http.StatusInternalServerError)
					return
				}
				keyRec.BundleID = clientBundleID
			} else if keyRec.BundleID != clientBundleID {
				// Spoofing attempt
				http.Error(w, "Bundle ID mismatch. Key is bound to another application.", http.StatusForbidden)
				return
			}

			// Inject TenantID into request context so downstream handlers can tag the metrics
			ctx := context.WithValue(r.Context(), TenantIDKey, keyRec.TenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
