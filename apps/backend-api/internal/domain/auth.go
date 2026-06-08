package domain

import "context"

// User holds non-sensitive user identity details.
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// UserCredentials contains credentials for login verification.
type UserCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Confirmation represents the confirmation claim for DPoP binding.
type Confirmation struct {
	Jkt string `json:"jkt"`
}

// TokenClaims represents the payload embedded in the asymmetric JWT access tokens.
type TokenClaims struct {
	UserID    string        `json:"userId"`
	Username  string        `json:"username"`
	ExpiresAt int64         `json:"expiresAt"`
	Cnf       *Confirmation `json:"cnf,omitempty"`
}

// AuthRepository defines the outbound port for querying user authorization details.
type AuthRepository interface {
	GetUserByUsername(ctx context.Context, username string) (User, string, error)
}

// TokenService defines the outbound port for signing and verifying tokens using asymmetric keys.
type TokenService interface {
	GenerateTokenPair(ctx context.Context, user User, jkt string) (string, string, error)
	ValidateToken(ctx context.Context, tokenStr string) (*TokenClaims, error)
}
