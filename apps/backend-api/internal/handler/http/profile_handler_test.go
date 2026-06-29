package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProfileHandler_GetProfile(t *testing.T) {
	handler := NewProfileHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile/me", nil)
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
