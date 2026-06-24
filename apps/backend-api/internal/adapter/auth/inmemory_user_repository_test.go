package auth_test

import (
	"context"
	"testing"

	"sovereign-core/backend-api/internal/adapter/auth"
)

func TestInMemoryUserRepository(t *testing.T) {
	repo := auth.NewInMemoryUserRepository()
	ctx := context.Background()

	t.Run("GetUserByUsername - found", func(t *testing.T) {
		user, pass, err := repo.GetUserByUsername(ctx, "admin")
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if user.Username != "admin" {
			t.Errorf("expected admin, got %s", user.Username)
		}
		if pass == "" {
			t.Errorf("expected password to not be empty")
		}
	})

	t.Run("GetUserByUsername - not found", func(t *testing.T) {
		_, _, err := repo.GetUserByUsername(ctx, "nonexistent")
		if err == nil {
			t.Fatal("expected error for nonexistent user")
		}
	})

	t.Run("GetUserByID - found", func(t *testing.T) {
		user, err := repo.GetUserByID(ctx, "usr_admin_99")
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if user.Username != "admin" {
			t.Errorf("expected admin, got %s", user.Username)
		}
	})

	t.Run("GetUserByID - not found", func(t *testing.T) {
		_, err := repo.GetUserByID(ctx, "invalid_id")
		if err == nil {
			t.Fatal("expected error for nonexistent user")
		}
	})
}
