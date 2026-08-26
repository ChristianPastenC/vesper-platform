package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"vesper-core/demo-backend/internal/domain"
	apiHTTP "vesper-core/demo-backend/internal/handler/http"
	"vesper-core/demo-backend/internal/handler/middleware"
	"vesper-core/demo-backend/internal/usecase"
)

// Reusing mock implementations for the AuthHandler tests
type mockAuthRepo struct {
	user     domain.User
	password string
	err      error
}

func (m *mockAuthRepo) RegisterUser(ctx context.Context, user domain.User, passwordHash string) error {
	return nil
}

func (m *mockAuthRepo) GetUserByUsername(ctx context.Context, username string) (domain.User, string, error) {
	if m.err != nil {
		return domain.User{}, "", m.err
	}
	return m.user, m.password, nil
}

func (m *mockAuthRepo) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	if m.err != nil {
		return domain.User{}, m.err
	}
	return m.user, nil
}

func (m *mockAuthRepo) UpdateUser(ctx context.Context, userID string, updates domain.UserUpdate) (domain.User, error) {
	return m.user, m.err
}

type mockTokenService struct {
	accessToken  string
	refreshToken string
	err          error
	validUser    domain.User
	validErr     error
}

func (m *mockTokenService) GenerateTokenPair(ctx context.Context, user domain.User, jkt string) (string, string, error) {
	return m.accessToken, m.refreshToken, m.err
}

func (m *mockTokenService) ValidateToken(ctx context.Context, tokenStr string) (*domain.TokenClaims, error) {
	return nil, nil
}

func (m *mockTokenService) ValidateRefreshToken(ctx context.Context, refreshToken string) (domain.User, error) {
	return m.validUser, m.validErr
}

func (m *mockTokenService) IssueRefreshToken(ctx context.Context, userID string) (string, error) {
	return m.refreshToken, m.err
}

func (m *mockTokenService) RevokeRefreshToken(ctx context.Context, token string) error {
	return m.err
}

func TestAuthHandler_Login(t *testing.T) {
	repo := &mockAuthRepo{user: domain.User{ID: "1", Username: "testuser"}, password: "$2a$10$OddE2NClmoqtz3M/i0kGNeRlxKjKpkJySNUDUqb3Ucbb7YX6OTPJm"}
	svc := &mockTokenService{accessToken: "acc", refreshToken: "ref"}
	interactor := usecase.NewAuthInteractor(repo, svc)
	handler := apiHTTP.NewAuthHandler(interactor)

	t.Run("success", func(t *testing.T) {
		body := []byte(`{"username":"testuser","password":"password123"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		handler.Login(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Code)
		}

		var res map[string]any
		json.Unmarshal(w.Body.Bytes(), &res)
		if res["accessToken"] != "acc" {
			t.Errorf("expected accessToken 'acc', got %v", res["accessToken"])
		}
	})

	t.Run("wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/login", nil)
		w := httptest.NewRecorder()

		handler.Login(w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected 405, got %d", w.Code)
		}
	})

	t.Run("invalid credentials", func(t *testing.T) {
		body := []byte(`{"username":"testuser","password":"wrong"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		handler.Login(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
	})
}

func TestAuthHandler_Refresh(t *testing.T) {
	repo := &mockAuthRepo{}
	svc := &mockTokenService{validUser: domain.User{ID: "1"}, accessToken: "new_acc", refreshToken: "new_ref"}
	interactor := usecase.NewAuthInteractor(repo, svc)
	handler := apiHTTP.NewAuthHandler(interactor)

	t.Run("success", func(t *testing.T) {
		body := []byte(`{"refresh_token":"ref_123"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(body))
		ctx := context.WithValue(req.Context(), middleware.JKTContextKey, "jkt_val")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		handler.Refresh(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("missing token", func(t *testing.T) {
		body := []byte(`{"refresh_token":""}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		handler.Refresh(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})

	t.Run("invalid token", func(t *testing.T) {
		svc.validErr = errors.New("invalid")
		body := []byte(`{"refresh_token":"bad_ref"}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		handler.Refresh(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
		svc.validErr = nil
	})
}
