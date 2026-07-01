package usecase_test

import (
	"context"
	"errors"
	"testing"

	"sovereign-core/backend-api/internal/domain"
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

func TestPaymentInteractor_ProcessOrder(t *testing.T) {
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		gw := &mockPaymentGateway{
			resp: domain.TransactionResponse{
				TransactionID: "tx_123",
				Status:        "success",
			},
		}
		repo := &mockOrderRepo{}

		interactor := usecase.NewPaymentInteractor(gw, repo)

		res, err := interactor.ProcessOrder(ctx, "user-1", 100.0, domain.CardDetails{}, nil)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if res.TransactionID != "tx_123" {
			t.Errorf("expected tx_123, got %s", res.TransactionID)
		}
		if res.ReceiptHash == "" {
			t.Error("expected receipt hash to be generated")
		}
	})

	t.Run("gateway error", func(t *testing.T) {
		gw := &mockPaymentGateway{
			err: errors.New("insufficient funds"),
		}
		repo := &mockOrderRepo{}

		interactor := usecase.NewPaymentInteractor(gw, repo)

		_, err := interactor.ProcessOrder(ctx, "user-1", 100.0, domain.CardDetails{}, nil)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
