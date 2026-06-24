package client

import (
	"context"
	"strings"
	"testing"

	"sovereign-core/backend-api/internal/domain"
)

func TestStripeGateway_CreateCharge(t *testing.T) {
	gw := NewStripeGateway()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		card := domain.CardDetails{Number: "4242"}
		resp, err := gw.CreateCharge(ctx, 100.0, "usd", card)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if resp.Status != "succeeded" {
			t.Errorf("expected succeeded, got %s", resp.Status)
		}
		if resp.TransactionID == "" {
			t.Errorf("expected non-empty transaction ID")
		}
	})

	t.Run("card declined", func(t *testing.T) {
		card := domain.CardDetails{Number: "0000"}
		_, err := gw.CreateCharge(ctx, 100.0, "usd", card)
		if err == nil {
			t.Fatalf("expected error for declined card")
		}
		if !strings.Contains(err.Error(), "card declined") {
			t.Errorf("expected card declined error message, got: %v", err)
		}
	})

	t.Run("network timeout simulation", func(t *testing.T) {
		card := domain.CardDetails{Number: "5555"}
		_, err := gw.CreateCharge(ctx, 100.0, "usd", card)
		if err == nil {
			t.Fatalf("expected error for timeout simulation")
		}
		if !strings.Contains(err.Error(), "network timeout simulation") {
			t.Errorf("expected network timeout simulation error, got: %v", err)
		}
	})
}
