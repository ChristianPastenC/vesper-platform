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

	"vesper-core/demo-backend/internal/domain"
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
	userRepo   domain.AuthRepository
	tokenRepo  domain.RefreshTokenRepository
}

// NewEcdsaTokenService creates an EcdsaTokenService instance.
func NewEcdsaTokenService(privateKey *ecdsa.PrivateKey, publicKey *ecdsa.PublicKey, tokenTTL time.Duration, userRepo domain.AuthRepository, tokenRepo domain.RefreshTokenRepository) *EcdsaTokenService {
	if tokenTTL <= 0 {
		tokenTTL = 15 * time.Minute
	}
	return &EcdsaTokenService{
		privateKey: privateKey,
		publicKey:  publicKey,
		tokenTTL:   tokenTTL,
		userRepo:   userRepo,
		tokenRepo:  tokenRepo,
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
	
	refreshToken, err := e.IssueRefreshToken(ctx, user.ID)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
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

func (e *EcdsaTokenService) IssueRefreshToken(ctx context.Context, userID string) (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("token_service: failed to generate refresh token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)

	tokenHashBytes := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", tokenHashBytes)

	expiresAt := time.Now().Add(7 * 24 * time.Hour).Unix()
	if err := e.tokenRepo.Save(ctx, tokenHash, userID, expiresAt); err != nil {
		return "", fmt.Errorf("token_service: failed to save refresh token: %w", err)
	}

	return token, nil
}

func (e *EcdsaTokenService) RevokeRefreshToken(ctx context.Context, token string) error {
	tokenHashBytes := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", tokenHashBytes)
	return e.tokenRepo.Delete(ctx, tokenHash)
}

// ValidateRefreshToken checks if the refresh token is valid, rotating it by deleting it upon use.
func (e *EcdsaTokenService) ValidateRefreshToken(ctx context.Context, refreshToken string) (domain.User, error) {
	tokenHashBytes := sha256.Sum256([]byte(refreshToken))
	tokenHash := fmt.Sprintf("%x", tokenHashBytes)

	userID, expiresAt, err := e.tokenRepo.Get(ctx, tokenHash)
	if err != nil || time.Now().Unix() > expiresAt {
		return domain.User{}, errors.New("token_service: refresh token invalid or expired")
	}

	// Rotate: One-time use token
	_ = e.tokenRepo.Delete(ctx, tokenHash)

	user, err := e.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return domain.User{}, errors.New("token_service: user not found for refresh token")
	}

	return user, nil
}
