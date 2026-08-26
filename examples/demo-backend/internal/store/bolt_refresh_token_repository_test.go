package store

import (
	"context"
	"path/filepath"
	"testing"
	"time"
)

func TestBoltRefreshTokenRepository(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := OpenDB(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	defer db.Close()

	if err := InitBuckets(db); err != nil {
		t.Fatalf("failed to init buckets: %v", err)
	}

	repo := NewBoltRefreshTokenRepository(db)
	ctx := context.Background()

	// Test Save
	err = repo.Save(ctx, "hash123", "user-1", time.Now().Add(1*time.Hour).Unix())
	if err != nil {
		t.Errorf("failed to save token: %v", err)
	}

	// Test Get
	userID, expiresAt, err := repo.Get(ctx, "hash123")
	if err != nil {
		t.Errorf("failed to get token: %v", err)
	}
	if userID != "user-1" {
		t.Errorf("expected user-1, got %v", userID)
	}
	if expiresAt == 0 {
		t.Errorf("expected non-zero expiration")
	}

	// Test Get not found
	_, _, err = repo.Get(ctx, "non-existent")
	if err == nil {
		t.Errorf("expected error for non-existent token")
	}

	// Test Delete
	err = repo.Delete(ctx, "hash123")
	if err != nil {
		t.Errorf("failed to delete token: %v", err)
	}

	// Verify Delete
	_, _, err = repo.Get(ctx, "hash123")
	if err == nil {
		t.Errorf("expected error after delete")
	}
}
