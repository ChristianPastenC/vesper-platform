package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
)

// HashValidator intercepts requests, reads the body, and validates the payload's integrity
// by comparing the recalculated HMAC-SHA256 against the X-Sovereign-Hash header.
func HashValidator(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip validation for methods that do not have a body
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		clientHashHex := r.Header.Get("X-Sovereign-Hash")
		if clientHashHex == "" {
			http.Error(w, "Forbidden: Missing X-Sovereign-Hash header", http.StatusForbidden)
			return
		}

		clientHash, err := hex.DecodeString(clientHashHex)
		if err != nil {
			http.Error(w, "Forbidden: Invalid X-Sovereign-Hash format", http.StatusForbidden)
			return
		}

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Internal Server Error: Unable to read request body", http.StatusInternalServerError)
			return
		}
		
		// Restore the body so downstream handlers and middlewares can read it
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		secretKey := os.Getenv("PAYLOAD_SECRET_KEY")
		if secretKey == "" {
			// In a production environment, this should be logged and the request blocked
			http.Error(w, "Internal Server Error: Missing PAYLOAD_SECRET_KEY", http.StatusInternalServerError)
			return
		}

		// Calculate the HMAC-SHA256 of the payload
		mac := hmac.New(sha256.New, []byte(secretKey))
		mac.Write(bodyBytes)
		expectedHash := mac.Sum(nil)

		// Compare using hmac.Equal to prevent timing attacks
		if !hmac.Equal(clientHash, expectedHash) {
			http.Error(w, "Forbidden: Payload integrity verification failed", http.StatusForbidden)
			return
		}

		// Continue with the next handler if validation is successful
		next.ServeHTTP(w, r)
	})
}
