package middleware_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"sovereign-core/backend-api/internal/handler/middleware"
)

func TestIdempotencyMiddleware(t *testing.T) {
	manager := middleware.NewIdempotencyManager()

	// Create a slow handler to simulate processing and allow conflict testing
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(50 * time.Millisecond)
		w.Header().Set("X-Custom", "handler-val")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"status":"ok"}`))
	})

	handler := manager.Middleware(nextHandler)

	t.Run("skips if not target path or missing key", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/other", bytes.NewBuffer([]byte(`{}`)))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d", w.Code)
		}
	})

	t.Run("missing block hash in payload", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer([]byte(`{}`)))
		req.Header.Set("X-Idempotency-Key", "idemp_123")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for missing ledger hash, got %d", w.Code)
		}
	})

	t.Run("successful processing and replay", func(t *testing.T) {
		body := []byte(`{"ledger":[{"hash":"hash_1"}]}`)

		// First request (Processing)
		req1 := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer(body))
		req1.Header.Set("X-Idempotency-Key", "idemp_abc")
		w1 := httptest.NewRecorder()

		handler.ServeHTTP(w1, req1)

		if w1.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d", w1.Code)
		}

		// Second request (Replay)
		req2 := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer(body))
		req2.Header.Set("X-Idempotency-Key", "idemp_abc")
		w2 := httptest.NewRecorder()

		handler.ServeHTTP(w2, req2)

		if w2.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d", w2.Code)
		}
		if w2.Header().Get("X-Cache-Lookup") != "HIT - Idempotent" {
			t.Errorf("expected replay header")
		}
		if w2.Body.String() != `{"status":"ok"}` {
			t.Errorf("expected replayed body, got %s", w2.Body.String())
		}
	})

	t.Run("conflict during processing", func(t *testing.T) {
		body := []byte(`{"ledger":[{"hash":"hash_2"}]}`)
		req1 := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer(body))
		req1.Header.Set("X-Idempotency-Key", "idemp_xyz")

		req2 := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer(body))
		req2.Header.Set("X-Idempotency-Key", "idemp_xyz")

		var wg sync.WaitGroup
		wg.Add(2)

		w1 := httptest.NewRecorder()
		w2 := httptest.NewRecorder()

		go func() {
			defer wg.Done()
			handler.ServeHTTP(w1, req1)
		}()

		// Small delay to ensure the first request locks the state to "processing"
		time.Sleep(10 * time.Millisecond)

		go func() {
			defer wg.Done()
			handler.ServeHTTP(w2, req2)
		}()

		wg.Wait()

		// One should succeed (201), the other should get a Conflict (409)
		if w1.Code != http.StatusCreated && w1.Code != http.StatusConflict {
			t.Errorf("unexpected w1 code: %d", w1.Code)
		}
		if w2.Code != http.StatusCreated && w2.Code != http.StatusConflict {
			t.Errorf("unexpected w2 code: %d", w2.Code)
		}
		if w1.Code == w2.Code {
			t.Errorf("expected one success and one conflict, got both %d", w1.Code)
		}
	})
}
