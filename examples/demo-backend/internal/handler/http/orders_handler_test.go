package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"vesper-core/demo-backend/internal/domain"
	"vesper-core/demo-backend/internal/handler/middleware"
)

type mockOrderRepo struct{}

func (m *mockOrderRepo) SaveOrder(ctx context.Context, order domain.Order) error { return nil }
func (m *mockOrderRepo) GetOrderByID(ctx context.Context, orderID string) (domain.Order, error) {
	return domain.Order{}, nil
}
func (m *mockOrderRepo) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	return []domain.Order{
		{ID: "ORD-123"},
	}, nil
}

func TestOrdersHandler_GetOrders(t *testing.T) {
	repo := &mockOrderRepo{}
	handler := NewOrdersHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, "1")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	handler.GetOrders(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", rr.Code)
	}

	var response []domain.Order
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if len(response) == 0 {
		t.Errorf("expected orders in response")
	}
}
