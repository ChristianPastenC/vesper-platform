package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"vesper-core/demo-backend/internal/domain"
	"vesper-core/demo-backend/internal/handler/middleware"
)

type mockAuthRepo struct {
	user domain.User
	err  error
}

func (m *mockAuthRepo) RegisterUser(ctx context.Context, user domain.User, passwordHash string) error {
	return nil
}

func (m *mockAuthRepo) GetUserByUsername(ctx context.Context, username string) (domain.User, string, error) {
	return m.user, "", m.err
}

func (m *mockAuthRepo) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	return m.user, m.err
}

func (m *mockAuthRepo) UpdateUser(ctx context.Context, userID string, updates domain.UserUpdate) (domain.User, error) {
	if updates.FirstName != "" {
		m.user.FirstName = updates.FirstName
	}
	return m.user, m.err
}

func TestProfileHandler_GetProfile(t *testing.T) {
	repo := &mockAuthRepo{
		user: domain.User{
			ID:    "1",
			Email: "test@example.com",
		},
	}
	handler := NewProfileHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile/me", nil)
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.GetProfile(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if _, ok := response["id"]; !ok {
		t.Errorf("expected response to contain 'id'")
	}
	if _, ok := response["email"]; !ok {
		t.Errorf("expected response to contain 'email'")
	}
}

func TestProfileHandler_UpdateProfile(t *testing.T) {
	repo := &mockAuthRepo{
		user: domain.User{
			ID:    "1",
			Email: "test@example.com",
		},
	}
	handler := NewProfileHandler(repo)

	body := `{"firstName": "NewName"}`
	req := httptest.NewRequest(http.MethodPut, "/api/v1/profile/me", strings.NewReader(body))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.UpdateProfile(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if response["firstName"] != "NewName" {
		t.Errorf("expected firstName to be updated")
	}

	// Test empty body
	reqEmpty := httptest.NewRequest(http.MethodPut, "/api/v1/profile/me", strings.NewReader(""))
	reqEmpty = reqEmpty.WithContext(ctx)
	rrEmpty := httptest.NewRecorder()
	handler.UpdateProfile(rrEmpty, reqEmpty)

	if rrEmpty.Code != http.StatusBadRequest {
		t.Errorf("expected status Bad Request for empty body, got %v", rrEmpty.Code)
	}
}
