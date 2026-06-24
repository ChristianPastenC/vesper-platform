package middleware_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/handler/middleware"
)

type mockTokenService struct {
	claims *domain.TokenClaims
	err    error
}

func (m *mockTokenService) GenerateTokenPair(ctx context.Context, user domain.User, jkt string) (string, string, error) {
	return "", "", nil
}

func (m *mockTokenService) ValidateToken(ctx context.Context, tokenStr string) (*domain.TokenClaims, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.claims, nil
}

func (m *mockTokenService) ValidateRefreshToken(ctx context.Context, refreshToken string) (domain.User, error) {
	return domain.User{}, nil
}

func TestJWTAuth(t *testing.T) {
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok || userID == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	svc := &mockTokenService{
		claims: &domain.TokenClaims{
			UserID: "user_1",
		},
	}
	mw := middleware.JWTAuth(svc)
	handler := mw(nextHandler)

	t.Run("success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer valid_token")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}
	})

	t.Run("missing header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
	})

	t.Run("malformed header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "invalid_token")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
	})

	t.Run("invalid token", func(t *testing.T) {
		svc.err = errors.New("expired")
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer bad_token")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
		svc.err = nil
	})

	t.Run("dpop binding mismatch", func(t *testing.T) {
		svc.claims = &domain.TokenClaims{
			UserID: "user_1",
			Cnf:    &domain.Confirmation{Jkt: "expected_jkt"},
		}
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer token")
		// Not setting the JKT in context, should fail
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}

		// Try with wrong JKT
		ctx := context.WithValue(req.Context(), middleware.JKTContextKey, "wrong_jkt")
		req = req.WithContext(ctx)
		w = httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}

		// Try with correct JKT
		ctx = context.WithValue(req.Context(), middleware.JKTContextKey, "expected_jkt")
		req = req.WithContext(ctx)
		w = httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}
	})
}
