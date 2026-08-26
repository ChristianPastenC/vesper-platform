package store_test

import (
	"context"
	"path/filepath"
	"testing"

	"vesper-core/demo-backend/internal/domain"
	"vesper-core/demo-backend/internal/store"
)

func TestBoltUserRepository(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test.db")

	db, err := store.OpenDB(dbPath)
	if err != nil {
		t.Fatalf("failed to open DB: %v", err)
	}
	defer db.Close()

	if err := store.InitBuckets(db); err != nil {
		t.Fatalf("failed to init buckets: %v", err)
	}

	repo := store.NewBoltUserRepository(db)
	ctx := context.Background()

	t.Run("Register and Get", func(t *testing.T) {
		user := domain.User{
			ID:       "usr_123",
			Username: "alice",
			Email:    "alice@example.com",
		}

		err := repo.RegisterUser(ctx, user, "hashed_pw")
		if err != nil {
			t.Fatalf("failed to register user: %v", err)
		}

		// Get By Username
		u, hash, err := repo.GetUserByUsername(ctx, "alice")
		if err != nil {
			t.Errorf("failed to get user by username: %v", err)
		}
		if u.ID != "usr_123" || hash != "hashed_pw" {
			t.Errorf("unexpected user data: %+v, hash: %s", u, hash)
		}

		// Get By ID
		u2, err := repo.GetUserByID(ctx, "usr_123")
		if err != nil {
			t.Errorf("failed to get user by id: %v", err)
		}
		if u2.Username != "alice" {
			t.Errorf("unexpected username: %s", u2.Username)
		}
	})

	t.Run("Duplicate Username", func(t *testing.T) {
		user := domain.User{
			ID:       "usr_456",
			Username: "alice", // same as before
			Email:    "alice2@example.com",
		}
		err := repo.RegisterUser(ctx, user, "hash")
		if err == nil || err.Error() != "user_repository: username already taken" {
			t.Errorf("expected duplicate username error, got %v", err)
		}
	})

	t.Run("Not Found", func(t *testing.T) {
		_, _, err := repo.GetUserByUsername(ctx, "bob")
		if err == nil || err.Error() != "user_repository: user not found" {
			t.Errorf("expected not found error, got %v", err)
		}

		_, err = repo.GetUserByID(ctx, "usr_999")
		if err == nil || err.Error() != "user_repository: user not found" {
			t.Errorf("expected not found error, got %v", err)
		}
	})
}
