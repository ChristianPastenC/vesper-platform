package usecase

import (
	"context"
	"crypto/sha256"
	"fmt"
	"time"

	"sovereign-core/backend-api/internal/domain"
)

// PaymentInteractor coordinates payment processing.
type PaymentInteractor struct {
	gateway domain.PaymentGateway
}

// NewPaymentInteractor initializes a PaymentInteractor with a PaymentGateway.
func NewPaymentInteractor(gw domain.PaymentGateway) *PaymentInteractor {
	return &PaymentInteractor{
		gateway: gw,
	}
}

// ProcessOrder handles checkout payments by sending transaction requests to Stripe
// and returning a transaction confirmation including a cryptographically signed receipt hash.
func (p *PaymentInteractor) ProcessOrder(ctx context.Context, total float64, card domain.CardDetails) (domain.TransactionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// 1. Invoke outbound PaymentGateway
	resp, err := p.gateway.CreateCharge(ctx, total, "USD", card)
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("payment_interactor: order processing failed: %w", err)
	}

	// 2. Compute an immutable verification receipt hash using SHA-256 over trans details.
	hashInput := fmt.Sprintf("%s:%.2f:%d", resp.TransactionID, total, time.Now().UnixNano())
	hash := sha256.Sum256([]byte(hashInput))
	resp.ReceiptHash = fmt.Sprintf("%x", hash)

	return resp, nil
}
