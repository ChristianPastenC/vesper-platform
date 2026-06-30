package domain

import "context"

// PaymentIntent holds payment status and transactional metadata.
type PaymentIntent struct {
	ID        string  `json:"id"`
	Amount    float64 `json:"amount"`
	Currency  string  `json:"currency"`
	Status    string  `json:"status"`
	CreatedAt int64   `json:"createdAt"`
}

// CardDetails encapsulates payment card information for simulated transactions.
type CardDetails struct {
	Number   string `json:"number"`
	ExpMonth int    `json:"expMonth"`
	ExpYear  int    `json:"expYear"`
	CVC      string `json:"cvc"`
}

// TransactionBlock represents a cryptographically secure, immutable step in the local client ledger.
type TransactionBlock struct {
	Index         int    `json:"index"`
	Timestamp     int64  `json:"timestamp"`
	Payload       string `json:"payload"`
	PrecedingHash string `json:"precedingHash"`
	Hash          string `json:"hash"`
}

// TransactionResponse contains the results of a processed checkout transaction.
type TransactionResponse struct {
	TransactionID string `json:"transactionId"`
	Status        string `json:"status"`
	ReceiptHash   string `json:"receiptHash"` // Immutable transactional confirmation hash
}

// PaymentGateway defines the outbound port to execute Stripe charge processing.
type PaymentGateway interface {
	CreateCharge(ctx context.Context, amount float64, currency string, card CardDetails) (TransactionResponse, error)
}
