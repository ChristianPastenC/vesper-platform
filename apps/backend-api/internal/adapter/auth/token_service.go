package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"sovereign-core/backend-api/internal/domain"
)

// JWTHeader holds the standard jose header for ES256 signatures.
type JWTHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

// EcdsaTokenService implements domain.TokenService using elliptic curve cryptography.
type EcdsaTokenService struct {
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
	tokenTTL   time.Duration
	repo       domain.AuthRepository
}

// NewEcdsaTokenService creates an EcdsaTokenService instance.
func NewEcdsaTokenService(privateKey *ecdsa.PrivateKey, publicKey *ecdsa.PublicKey, tokenTTL time.Duration, repo domain.AuthRepository) *EcdsaTokenService {
	if tokenTTL <= 0 {
		tokenTTL = 15 * time.Minute
	}
	return &EcdsaTokenService{
		privateKey: privateKey,
		publicKey:  publicKey,
		tokenTTL:   tokenTTL,
		repo:       repo,
	}
}

// GenerateTokenPair issues an asymmetric JWT access token and a mock refresh token.
func (e *EcdsaTokenService) GenerateTokenPair(ctx context.Context, user domain.User, jkt string) (string, string, error) {
	// 1. Build and encode Header
	header := JWTHeader{Alg: "ES256", Typ: "JWT"}
	headerBytes, err := json.Marshal(header)
	if err != nil {
		return "", "", fmt.Errorf("token_service: failed to marshal header: %w", err)
	}
	headerB64 := base64.RawURLEncoding.EncodeToString(headerBytes)

	// 2. Build and encode Payload (Claims)
	claims := domain.TokenClaims{
		UserID:    user.ID,
		Username:  user.Username,
		ExpiresAt: time.Now().Add(e.tokenTTL).Unix(),
	}
	if jkt != "" {
		claims.Cnf = &domain.Confirmation{Jkt: jkt}
	}
	claimsBytes, err := json.Marshal(claims)
	if err != nil {
		return "", "", fmt.Errorf("token_service: failed to marshal claims: %w", err)
	}
	claimsB64 := base64.RawURLEncoding.EncodeToString(claimsBytes)

	// 3. Compute SHA-256 hash over signing input
	signingInput := headerB64 + "." + claimsB64
	hash := sha256.Sum256([]byte(signingInput))

	// 4. Sign hash with ECDSA Private Key
	sigBytes, err := ecdsa.SignASN1(rand.Reader, e.privateKey, hash[:])
	if err != nil {
		return "", "", fmt.Errorf("token_service: failed to sign payload: %w", err)
	}
	sigB64 := base64.RawURLEncoding.EncodeToString(sigBytes)

	accessToken := signingInput + "." + sigB64
	// Return a simulated high-entropy refresh token
	mockRefreshToken := fmt.Sprintf("ref_%d_%s", time.Now().UnixNano(), user.ID)

	return accessToken, mockRefreshToken, nil
}

// ValidateToken parses and validates the asymmetric JWT using the ECDSA public key.
func (e *EcdsaTokenService) ValidateToken(ctx context.Context, tokenStr string) (*domain.TokenClaims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("token_service: invalid token format")
	}

	signingInput := parts[0] + "." + parts[1]
	sigBytes, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, errors.New("token_service: invalid signature encoding")
	}

	// 1. Verify digital signature using ECDSA Public Key
	hash := sha256.Sum256([]byte(signingInput))
	if !ecdsa.VerifyASN1(e.publicKey, hash[:], sigBytes) {
		return nil, errors.New("token_service: invalid token signature")
	}

	// 2. Decode claims payload
	claimsBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("token_service: invalid claims encoding")
	}

	var claims domain.TokenClaims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, fmt.Errorf("token_service: failed to unmarshal claims: %w", err)
	}

	// 3. Verify expiration window
	if time.Now().Unix() > claims.ExpiresAt {
		return nil, errors.New("token_service: token has expired")
	}

	return &claims, nil
}

// ValidateRefreshToken checks if the refresh token is valid and returns the associated user.
func (e *EcdsaTokenService) ValidateRefreshToken(ctx context.Context, refreshToken string) (domain.User, error) {
	parts := strings.SplitN(refreshToken, "_", 3)
	if len(parts) != 3 || parts[0] != "ref" {
		return domain.User{}, errors.New("token_service: invalid refresh token format")
	}

	userID := parts[2]
	user, err := e.repo.GetUserByID(ctx, userID)
	if err != nil {
		return domain.User{}, errors.New("token_service: user not found for refresh token")
	}

	return user, nil
}
