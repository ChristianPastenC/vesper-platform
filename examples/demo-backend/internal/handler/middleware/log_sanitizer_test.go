package middleware_test

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"vesper-core/demo-backend/internal/handler/middleware"
)

func TestLogSanitizer(t *testing.T) {
	t.Run("preserves body for downstream handlers while masking logs", func(t *testing.T) {
		payload := []byte(`{"pan":"4111111111111111","cvv":"123","email":"test@example.com"}`)

		nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			b, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("failed reading body: %v", err)
			}
			if !bytes.Equal(b, payload) {
				t.Errorf("expected original body to be preserved for crypto validation")
			}
			w.WriteHeader(http.StatusOK)
		})

		handler := middleware.LogSanitizer(nextHandler)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer(payload))
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", w.Code)
		}
	})
}
