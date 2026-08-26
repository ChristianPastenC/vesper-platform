package client

import (
	"context"
	"strings"
	"testing"
	"time"

	"vesper-core/demo-backend/internal/domain"
)

func TestMockPaymentGateway_Succeeded(t *testing.T) {
	gw := NewMockPaymentGateway()
	ctx := context.Background()

	resp, err := gw.CreateCharge(ctx, 100, "usd", domain.CardDetails{Number: "4242 4242 4242 4242"})
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if resp.Status != "succeeded" {
		t.Errorf("expected status 'succeeded', got: %s", resp.Status)
	}
	if !strings.HasPrefix(resp.TransactionID, "txn_") {
		t.Errorf("expected txn ID to start with txn_, got: %s", resp.TransactionID)
	}
}

func TestMockPaymentGateway_CardDeclined(t *testing.T) {
	gw := NewMockPaymentGateway()
	ctx := context.Background()

	_, err := gw.CreateCharge(ctx, 100, "usd", domain.CardDetails{Number: "4000 0000 0000 0002"})
	if err == nil || !strings.Contains(err.Error(), "card declined") {
		t.Fatalf("expected 'card declined' error, got: %v", err)
	}
}

func TestMockPaymentGateway_InsufficientFunds(t *testing.T) {
	gw := NewMockPaymentGateway()
	ctx := context.Background()

	_, err := gw.CreateCharge(ctx, 100, "usd", domain.CardDetails{Number: "4000 0000 0000 9995"})
	if err == nil || !strings.Contains(err.Error(), "insufficient funds") {
		t.Fatalf("expected 'insufficient funds' error, got: %v", err)
	}
}

func TestMockPaymentGateway_ProcessingError(t *testing.T) {
	gw := NewMockPaymentGateway()
	ctx := context.Background()

	_, err := gw.CreateCharge(ctx, 100, "usd", domain.CardDetails{Number: "4000 0000 0000 0119"})
	if err == nil || !strings.Contains(err.Error(), "processing error") {
		t.Fatalf("expected 'processing error' error, got: %v", err)
	}
}

func TestMockPaymentGateway_Timeout(t *testing.T) {
	gw := NewMockPaymentGateway()

	// Create a context that times out before the 150ms processing time
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := gw.CreateCharge(ctx, 100, "usd", domain.CardDetails{Number: "4242 4242 4242 4242"})
	if err == nil || err != context.DeadlineExceeded {
		t.Fatalf("expected deadline exceeded error, got: %v", err)
	}
}
