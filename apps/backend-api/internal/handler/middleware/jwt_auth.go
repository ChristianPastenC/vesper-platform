package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"sovereign-core/backend-api/internal/domain"
)

type contextKey string

// Context keys used to store verified user information in requests.
const (
	UserIDKey      contextKey = "userID"
	UsernameKey    contextKey = "username"
	JKTContextKey  contextKey = "jkt"
	TokenClaimsKey contextKey = "tokenClaims"
)

// GetUserIDFromContext retrieves the user ID from the request context, if present.
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(UserIDKey).(string)
	return val, ok
}

// GetUsernameFromContext retrieves the username from the request context, if present.
func GetUsernameFromContext(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(UsernameKey).(string)
	return val, ok
}

// GetJKTFromContext retrieves the DPoP JKT from the request context, if present.
func GetJKTFromContext(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(JKTContextKey).(string)
	return val, ok
}

// GetTokenClaimsFromContext retrieves the full TokenClaims from the request context, if present.
func GetTokenClaimsFromContext(ctx context.Context) (*domain.TokenClaims, bool) {
	val, ok := ctx.Value(TokenClaimsKey).(*domain.TokenClaims)
	return val, ok
}

// JWTAuth verifies incoming Bearer JWT tokens using the supplied TokenService.
func JWTAuth(tokenService domain.TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeErrorJSON(w, http.StatusUnauthorized, "unauthorized", "Missing Authorization header")
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				writeErrorJSON(w, http.StatusUnauthorized, "unauthorized", "Malformed Authorization header (expected Bearer <token>)")
				return
			}

			tokenStr := parts[1]
			claims, err := tokenService.ValidateToken(r.Context(), tokenStr)
			if err != nil {
				writeErrorJSON(w, http.StatusUnauthorized, "invalid_token", err.Error())
				return
			}

			// Enforce DPoP Binding if jkt claim is present (and bypass is not active)
			if claims.Cnf != nil && claims.Cnf.Jkt != "" && os.Getenv("DEV_DPOP_BYPASS") != "true" {
				jkt, ok := GetJKTFromContext(r.Context())
				if !ok || jkt != claims.Cnf.Jkt {
					writeErrorJSON(w, http.StatusUnauthorized, "invalid_dpop_binding", "DPoP token binding mismatch")
					return
				}
			}

			// Bind claims variables safely to the request context
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UsernameKey, claims.Username)
			ctx = context.WithValue(ctx, TokenClaimsKey, &claims)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// Helper to write JSON error messages in middleware.
func writeErrorJSON(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error":   code,
		"message": message,
	})
}
