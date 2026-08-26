package http_test

import (
	"bytes"
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"sovereign-core/backend-api/internal/domain"
	apiHTTP "sovereign-core/backend-api/internal/handler/http"
	"sovereign-core/backend-api/internal/handler/middleware"
	"sovereign-core/backend-api/internal/usecase"
)

type mockPaymentGateway struct {
	resp domain.TransactionResponse
	err  error
}

func (m *mockPaymentGateway) CreateCharge(ctx context.Context, amount float64, currency string, card domain.CardDetails) (domain.TransactionResponse, error) {
	if m.err != nil {
		return domain.TransactionResponse{}, m.err
	}
	return m.resp, nil
}

type mockOrderRepo struct{}

func (m *mockOrderRepo) SaveOrder(ctx context.Context, order domain.Order) error { return nil }
func (m *mockOrderRepo) GetOrderByID(ctx context.Context, orderID string) (domain.Order, error) {
	return domain.Order{}, nil
}
func (m *mockOrderRepo) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	return nil, nil
}

func TestPaymentHandler_ProcessPayment(t *testing.T) {
	gw := &mockPaymentGateway{
		resp: domain.TransactionResponse{
			TransactionID: "tx_123",
			Status:        "success",
		},
	}
	repo := &mockOrderRepo{}
	interactor := usecase.NewPaymentInteractor(gw, repo)
	idempMgr := middleware.NewIdempotencyManager()
	handler := apiHTTP.NewPaymentHandler(interactor, idempMgr)

	// compute valid genesis block hash
	raw := "gen" + "0" + "123456"
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(raw)))

	validBody := fmt.Sprintf(`{
		"total": 100.50,
		"card": {
			"number": "1234567812345678",
			"cvc": "123"
		},
		"ledger": [
			{
				"precedingHash": "0",
				"payload": "gen",
				"timestamp": 123456,
				"hash": "%s"
			}
		]
	}`, hash)

	t.Run("success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBufferString(validBody))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user_1")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		handler.ProcessPayment(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("missing context user", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer([]byte(`{}`)))
		w := httptest.NewRecorder()

		handler.ProcessPayment(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
	})

	t.Run("invalid total", func(t *testing.T) {
		body := []byte(`{"total": 0}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer(body))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user_1")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		handler.ProcessPayment(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})

	t.Run("invalid card length", func(t *testing.T) {
		body := []byte(`{"total": 100, "card": {"number": "123", "cvc": "123"}}`)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBuffer(body))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user_1")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		handler.ProcessPayment(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})

	t.Run("interactor error", func(t *testing.T) {
		gw.err = errors.New("gateway rejected")
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBufferString(validBody))
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user_1")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		handler.ProcessPayment(w, req)

		if w.Code != http.StatusPaymentRequired {
			t.Errorf("expected 402, got %d", w.Code)
		}
		gw.err = nil
	})
}
