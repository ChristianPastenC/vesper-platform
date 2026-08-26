package store

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"sovereign-core/backend-api/internal/domain"
)

func TestBoltOrderRepository(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "boltdb-test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := OpenDB(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	defer db.Close()

	if err := InitBuckets(db); err != nil {
		t.Fatalf("failed to init buckets: %v", err)
	}

	repo := NewBoltOrderRepository(db)
	ctx := context.Background()

	order := domain.Order{
		ID:     "ORD-123",
		UserID: "USR-1",
		Status: "processing",
		Date:   time.Now().Format(time.RFC3339),
		Total:  100.50,
	}

	// Test SaveOrder
	if err := repo.SaveOrder(ctx, order); err != nil {
		t.Fatalf("expected no error saving order, got %v", err)
	}

	// Test GetOrderByID
	fetched, err := repo.GetOrderByID(ctx, "ORD-123")
	if err != nil {
		t.Fatalf("expected no error fetching order, got %v", err)
	}
	if fetched.ID != "ORD-123" || fetched.Total != 100.50 {
		t.Errorf("fetched order data mismatch, got %+v", fetched)
	}

	// Test GetOrdersByUserID
	orders, err := repo.GetOrdersByUserID(ctx, "USR-1")
	if err != nil {
		t.Fatalf("expected no error fetching orders by user, got %v", err)
	}
	if len(orders) != 1 {
		t.Fatalf("expected 1 order, got %d", len(orders))
	}
	if orders[0].ID != "ORD-123" {
		t.Errorf("expected order ID ORD-123, got %s", orders[0].ID)
	}
}
