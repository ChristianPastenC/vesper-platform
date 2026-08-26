package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/time/rate"
	"vesper-core/demo-backend/internal/handler/middleware"
)

func TestRateLimiterMiddleware(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	t.Run("allows under burst limit", func(t *testing.T) {
		mw := middleware.NewRateLimiter(rate.Limit(100), 2)
		handler := mw.Middleware(nextHandler)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("X-Real-IP", "1.2.3.4")

		for i := 0; i < 2; i++ {
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				t.Errorf("expected 200 on req %d, got %d", i, w.Code)
			}
		}

		// Third request should be blocked
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusTooManyRequests {
			t.Errorf("expected 429, got %d", w.Code)
		}
	})

	t.Run("skips untargeted paths", func(t *testing.T) {
		mw := middleware.NewRateLimiter(rate.Limit(10), 1, "/api/protected")
		handler := mw.Middleware(nextHandler)

		// This path is not targeted, so it should not be limited
		req := httptest.NewRequest(http.MethodGet, "/api/public", nil)
		req.RemoteAddr = "2.2.2.2:1234"

		for i := 0; i < 5; i++ {
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				t.Errorf("expected 200, got %d", w.Code)
			}
		}
	})

	t.Run("public and protected limiters creation", func(t *testing.T) {
		// Just ensure they don't panic
		_ = middleware.PublicLimiter()
		_ = middleware.ProtectedLimiter()
	})
}
