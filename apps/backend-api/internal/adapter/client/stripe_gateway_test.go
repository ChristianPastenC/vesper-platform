package client

import (
	"context"
	"os"
	"strings"
	"testing"

	"sovereign-core/backend-api/internal/domain"
)

func TestStripeGateway_CreateCharge(t *testing.T) {
	gw, _ := NewStripeGateway()
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		card := domain.CardDetails{Number: "4242", Simulate: true}
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
		card := domain.CardDetails{Number: "0000", Simulate: true}
		_, err := gw.CreateCharge(ctx, 100.0, "usd", card)
		if err == nil {
			t.Fatalf("expected error for declined card")
		}
		if !strings.Contains(err.Error(), "card declined") {
			t.Errorf("expected card declined error message, got: %v", err)
		}
	})

	t.Run("network timeout simulation", func(t *testing.T) {
		card := domain.CardDetails{Number: "5555", Simulate: true}
		_, err := gw.CreateCharge(ctx, 100.0, "usd", card)
		if err == nil {
			t.Fatalf("expected error for timeout simulation")
		}
		if !strings.Contains(err.Error(), "mock request failed") {
			t.Errorf("expected mock request failed error, got: %v", err)
		}
	})

	t.Run("missing secret key real transaction", func(t *testing.T) {
		// Verify that NewStripeGateway returns an error when there is no key
		// In tests, STRIPE_SECRET_KEY is normally empty.
		originalKey := os.Getenv("STRIPE_SECRET_KEY")
		os.Setenv("STRIPE_SECRET_KEY", "")
		defer os.Setenv("STRIPE_SECRET_KEY", originalKey)

		_, err := NewStripeGateway()
		if err == nil {
			t.Fatalf("expected error from NewStripeGateway for missing secret key")
		}
		if !strings.Contains(err.Error(), "missing STRIPE_SECRET_KEY") {
			t.Errorf("expected missing secret key error, got: %v", err)
		}
	})
}
