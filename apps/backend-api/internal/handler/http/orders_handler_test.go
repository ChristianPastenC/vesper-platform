package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOrdersHandler_GetOrders(t *testing.T) {
	handler := NewOrdersHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	rr := httptest.NewRecorder()

	handler.GetOrders(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var response []Order
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if len(response) == 0 {
		t.Errorf("expected orders in response")
	}
}
