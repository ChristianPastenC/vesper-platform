package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestHashValidator(t *testing.T) {
	// Helper function to create a valid hash
	createHash := func(secret, body string) string {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(body))
		return hex.EncodeToString(mac.Sum(nil))
	}

	secretKey := "test-secret-key"
	os.Setenv("PAYLOAD_SECRET_KEY", secretKey)
	defer os.Unsetenv("PAYLOAD_SECRET_KEY")

	// Dummy handler that just reads the body to ensure it's still available
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
		w.Write(body)
	})

	middleware := HashValidator(nextHandler)

	tests := []struct {
		name           string
		method         string
		body           string
		headers        map[string]string
		setupEnv       func()
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Bypass GET method",
			method:         http.MethodGet,
			body:           "",
			headers:        nil,
			expectedStatus: http.StatusOK,
			expectedBody:   "",
		},
		{
			name:           "Missing X-Sovereign-Hash header",
			method:         http.MethodPost,
			body:           `{"amount": 100}`,
			headers:        nil,
			expectedStatus: http.StatusForbidden,
			expectedBody:   "Forbidden: Missing X-Sovereign-Hash header\n",
		},
		{
			name:           "Invalid hex format",
			method:         http.MethodPost,
			body:           `{"amount": 100}`,
			headers:        map[string]string{"X-Sovereign-Hash": "invalid-hex"},
			expectedStatus: http.StatusForbidden,
			expectedBody:   "Forbidden: Invalid X-Sovereign-Hash format\n",
		},
		{
			name:   "Missing secret key in env",
			method: http.MethodPost,
			body:   `{"amount": 100}`,
			headers: map[string]string{
				"X-Sovereign-Hash": createHash("dummy", `{"amount": 100}`),
			},
			setupEnv: func() {
				os.Setenv("PAYLOAD_SECRET_KEY", "")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "Internal Server Error: Missing PAYLOAD_SECRET_KEY\n",
		},
		{
			name:   "Invalid hash payload",
			method: http.MethodPost,
			body:   `{"amount": 100}`,
			headers: map[string]string{
				"X-Sovereign-Hash": createHash("wrong-secret", `{"amount": 100}`),
			},
			expectedStatus: http.StatusForbidden,
			expectedBody:   "Forbidden: Payload integrity verification failed\n",
		},
		{
			name:   "Valid hash payload",
			method: http.MethodPost,
			body:   `{"amount": 100}`,
			headers: map[string]string{
				"X-Sovereign-Hash": createHash(secretKey, `{"amount": 100}`),
			},
			expectedStatus: http.StatusOK,
			expectedBody:   `{"amount": 100}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Restore env if it was changed
			os.Setenv("PAYLOAD_SECRET_KEY", secretKey)
			if tt.setupEnv != nil {
				tt.setupEnv()
			}

			req := httptest.NewRequest(tt.method, "/", bytes.NewBufferString(tt.body))
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			rr := httptest.NewRecorder()
			middleware.ServeHTTP(rr, req)

			if status := rr.Code; status != tt.expectedStatus {
				t.Errorf("handler returned wrong status code: got %v want %v", status, tt.expectedStatus)
			}

			if body := rr.Body.String(); body != tt.expectedBody {
				t.Errorf("handler returned unexpected body: got %q want %q", body, tt.expectedBody)
			}
		})
	}
}
