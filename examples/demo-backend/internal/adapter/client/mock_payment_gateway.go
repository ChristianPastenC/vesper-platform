package client

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
	"time"

	"vesper-core/demo-backend/internal/domain"
)

// MockPaymentGateway implements domain.PaymentGateway using a native Go mock engine.
type MockPaymentGateway struct{}

// NewMockPaymentGateway initializes a MockPaymentGateway.
func NewMockPaymentGateway() *MockPaymentGateway {
	return &MockPaymentGateway{}
}

// CreateCharge executes a mock charge request based on the card number.
func (m *MockPaymentGateway) CreateCharge(ctx context.Context, amount float64, currency string, card domain.CardDetails) (domain.TransactionResponse, error) {
	// Respect the context timeout.
	select {
	case <-ctx.Done():
		return domain.TransactionResponse{}, ctx.Err()
	default:
	}

	// Simulate processing time
	select {
	case <-time.After(150 * time.Millisecond):
	case <-ctx.Done():
		return domain.TransactionResponse{}, ctx.Err()
	}

	number := strings.ReplaceAll(card.Number, " ", "")

	if strings.HasPrefix(number, "4000") && strings.HasSuffix(number, "0002") {
		return domain.TransactionResponse{}, errors.New("mock_payment_gateway: card declined")
	}

	if strings.HasPrefix(number, "4000") && strings.HasSuffix(number, "9995") {
		return domain.TransactionResponse{}, errors.New("mock_payment_gateway: insufficient funds")
	}

	if strings.HasPrefix(number, "4000") && strings.HasSuffix(number, "0119") {
		return domain.TransactionResponse{}, errors.New("mock_payment_gateway: processing error")
	}

	if strings.HasPrefix(number, "4242") || number == "" { // Default success
		var b [4]byte
		if _, err := rand.Read(b[:]); err != nil {
			return domain.TransactionResponse{}, fmt.Errorf("failed to generate nonce: %w", err)
		}
		nonce := binary.BigEndian.Uint32(b[:])
		txnID := fmt.Sprintf("txn_%d_%08x", time.Now().Unix(), nonce)

		return domain.TransactionResponse{
			TransactionID: txnID,
			Status:        "succeeded",
		}, nil
	}

	return domain.TransactionResponse{}, errors.New("mock_payment_gateway: card declined (unknown card)")
}
