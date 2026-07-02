package middleware

import (
	"bytes"
	"io"
	"net/http"
	"regexp"
)

var (
	// PANs (Credit cards 13-19 digits with optional spaces/dashes)
	panRegex = regexp.MustCompile(`\b(?:\d[ -]*?){13,19}\b`)
	
	// Emails
	emailRegex = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	
	// JWTs or Session tokens
	jwtRegex = regexp.MustCompile(`eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*`)
	
	// Long Hex/Base64 strings (Potential private keys or raw payloads > 64 chars)
	cryptoRegex = regexp.MustCompile(`\b[A-Fa-f0-9]{64,}\b|\b(?:[A-Za-z0-9+/]{4}){16,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b`)
)

// LogSanitizer intercepts the body, purges PII, and injects the clean body back into the request.
// It is designed to run BEFORE any parsing or routing logic touches the payload.
func LogSanitizer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only process requests with a body
		if r.Body == nil || r.Body == http.NoBody {
			next.ServeHTTP(w, r)
			return
		}

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Unable to read body for sanitization", http.StatusBadRequest)
			return
		}

		// Sequential in-memory sanitization (Zero-Trust isolation)
		sanitized := panRegex.ReplaceAll(bodyBytes, []byte("[MASKED_PAN]"))
		sanitized = emailRegex.ReplaceAll(sanitized, []byte("[MASKED_EMAIL]"))
		sanitized = jwtRegex.ReplaceAll(sanitized, []byte("[MASKED_TOKEN]"))
		sanitized = cryptoRegex.ReplaceAll(sanitized, []byte("[MASKED_CRYPTO_PAYLOAD]"))

		// Restore the clean body for the next handler
		r.Body = io.NopCloser(bytes.NewBuffer(sanitized))
		r.ContentLength = int64(len(sanitized))

		next.ServeHTTP(w, r)
	})
}
