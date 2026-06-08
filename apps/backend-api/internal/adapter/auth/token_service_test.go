package auth_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"testing"
	"time"

	"sovereign-core/backend-api/internal/adapter/auth"
	"sovereign-core/backend-api/internal/domain"
)

func TestTokenService_GenerateAndValidate(t *testing.T) {
	ctx := context.Background()

	// 1. Generate keys
	privKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate ECDSA key: %v", err)
	}
	pubKey := &privKey.PublicKey

	// 2. Initialize service
	svc := auth.NewEcdsaTokenService(privKey, pubKey, 1*time.Minute)

	user := domain.User{
		ID:       "usr_test_123",
		Username: "testuser",
		Email:    "test@example.com",
	}

	// 3. Generate Token Pair
	accessToken, refreshToken, err := svc.GenerateTokenPair(ctx, user, "")
	if err != nil {
		t.Fatalf("Failed to generate token pair: %v", err)
	}

	if accessToken == "" {
		t.Error("Access token should not be empty")
	}
	if refreshToken == "" {
		t.Error("Refresh token should not be empty")
	}

	// 4. Validate Token
	claims, err := svc.ValidateToken(ctx, accessToken)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected UserID %q, got %q", user.ID, claims.UserID)
	}
	if claims.Username != user.Username {
		t.Errorf("Expected Username %q, got %q", user.Username, claims.Username)
	}
	if claims.ExpiresAt <= time.Now().Unix() {
		t.Errorf("Token is already expired: %d", claims.ExpiresAt)
	}

	// 5. Test validation fails with a wrong public key
	wrongPrivKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	wrongPubKey := &wrongPrivKey.PublicKey
	wrongSvc := auth.NewEcdsaTokenService(privKey, wrongPubKey, 1*time.Minute)

	_, err = wrongSvc.ValidateToken(ctx, accessToken)
	if err == nil {
		t.Error("Expected validation to fail with a mismatched public key")
	}
}
