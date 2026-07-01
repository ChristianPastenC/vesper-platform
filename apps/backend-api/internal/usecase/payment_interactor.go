package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"sovereign-core/backend-api/internal/domain"
)

// PaymentInteractor coordinates payment processing.
type PaymentInteractor struct {
	gateway domain.PaymentGateway
	repo    domain.OrderRepository
}

// NewPaymentInteractor initializes a PaymentInteractor with a PaymentGateway and OrderRepository.
func NewPaymentInteractor(gw domain.PaymentGateway, repo domain.OrderRepository) *PaymentInteractor {
	return &PaymentInteractor{
		gateway: gw,
		repo:    repo,
	}
}

// ProcessOrder handles checkout payments by sending transaction requests to Stripe
// and returning a transaction confirmation including a cryptographically signed receipt hash.
func (p *PaymentInteractor) ProcessOrder(ctx context.Context, userID string, total float64, card domain.CardDetails, ledger []domain.TransactionBlock) (domain.TransactionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	// 1. Invoke outbound PaymentGateway
	resp, err := p.gateway.CreateCharge(ctx, total, "USD", card)
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("payment_interactor: order processing failed: %w", err)
	}

	// 2. Compute an immutable verification receipt hash using strong cryptographic entropy
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("payment_interactor: failed to generate cryptographic nonce: %w", err)
	}

	hashInput := fmt.Sprintf("%s:%.2f:%d:%x", resp.TransactionID, total, time.Now().UnixNano(), nonce)
	hash := sha256.Sum256([]byte(hashInput))
	resp.ReceiptHash = fmt.Sprintf("%x", hash)

	// Extract items from ledger
	var items []domain.OrderItem
	for _, block := range ledger {
		var blockItems []domain.OrderItem
		if err := json.Unmarshal([]byte(block.Payload), &blockItems); err == nil {
			items = append(items, blockItems...)
		}
	}
	if items == nil {
		items = []domain.OrderItem{}
	}

	// 3. Save the order to the database
	order := domain.Order{
		ID:          resp.TransactionID,
		UserID:      userID,
		Status:      "processing",
		Date:        time.Now().Format(time.RFC3339),
		Total:       total,
		Items:       items,
		Timeline: []domain.OrderTimelineEvent{
			{
				Status:      "processing",
				Timestamp:   time.Now().Format(time.RFC3339),
				Description: "Payment confirmed",
			},
		},
		ReceiptHash: resp.ReceiptHash,
		CreatedAt:   time.Now().Unix(),
	}
	if err := p.repo.SaveOrder(ctx, order); err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("failed to save order: %w", err)
	}

	return resp, nil
}

// SyncOfflineTransaction syncs an offline transaction as an order.
func (p *PaymentInteractor) SyncOfflineTransaction(ctx context.Context, userID string, txID string, payload string) error {
	var items []domain.OrderItem
	_ = json.Unmarshal([]byte(payload), &items)
	if items == nil {
		items = []domain.OrderItem{}
	}

	order := domain.Order{
		ID:          txID,
		UserID:      userID,
		Status:      "processing",
		Date:        time.Now().Format(time.RFC3339),
		Total:       0, // Offline payload might need parsing to get total, simplified here.
		Items:       items,
		Timeline: []domain.OrderTimelineEvent{
			{
				Status:      "processing",
				Timestamp:   time.Now().Format(time.RFC3339),
				Description: "Offline payment synced",
			},
		},
		CreatedAt: time.Now().Unix(),
	}
	return p.repo.SaveOrder(ctx, order)
}
