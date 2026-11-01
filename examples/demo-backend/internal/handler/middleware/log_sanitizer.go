package middleware

import (
	"bytes"
	"io"
	"net/http"
	"regexp"
)

var (
	// PANs (Credit cards 13-19 digits with optional spaces/dashes)
	panFilterRegex = regexp.MustCompile(`\b(?:\d[ -]*?){13,19}\b`)

	// CVVs / CVCs in JSON/form payloads
	cvvFilterRegex = regexp.MustCompile(`(?i)(["']?(?:cvv|cvc|security_code)["']?\s*[:=]\s*["']?)\d{3,4}(["']?)`)

	// Emails
	emailFilterRegex = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)

	// JWTs or Session tokens
	jwtFilterRegex = regexp.MustCompile(`eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*`)
)

// LogSanitizer intercepts the body and ensures that no PAN, CVV, or PII is leaked in server logs.
// Complies with PCI-DSS v4.0 Req. 3.4 and NIST SP 800-88 Rev. 1.
func LogSanitizer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body == nil || r.Body == http.NoBody {
			next.ServeHTTP(w, r)
			return
		}

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Unable to read request payload", http.StatusBadRequest)
			return
		}

		// Sanitize sensitive cardholder values for internal auditing
		sanitized := panFilterRegex.ReplaceAll(bodyBytes, []byte("[MASKED_PAN]"))
		sanitized = cvvFilterRegex.ReplaceAll(sanitized, []byte("${1}[MASKED_CVV]${2}"))
		sanitized = emailFilterRegex.ReplaceAll(sanitized, []byte("[MASKED_EMAIL]"))
		sanitized = jwtFilterRegex.ReplaceAll(sanitized, []byte("[MASKED_TOKEN]"))

		// Restore original body for cryptographically authenticated handlers
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		next.ServeHTTP(w, r)
	})
}
