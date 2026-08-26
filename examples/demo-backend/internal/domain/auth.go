package domain

import "context"

// User holds non-sensitive user identity details.
type User struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	FirstName string `json:"firstName,omitempty"`
	LastName  string `json:"lastName,omitempty"`
	Phone     string `json:"phone,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	CreatedAt int64  `json:"createdAt,omitempty"`
}

// UserUpdate struct for profile updates.
type UserUpdate struct {
	FirstName string `json:"firstName,omitempty"`
	LastName  string `json:"lastName,omitempty"`
	Phone     string `json:"phone,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
}

// UserCredentials contains credentials for login verification.
type UserCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// RegisterRequest holds data for registering a new user.
type RegisterRequest struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Phone     string `json:"phone,omitempty"`
}

// RefreshRequest payload for refreshing tokens.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
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
	RegisterUser(ctx context.Context, user User, passwordHash string) error
	GetUserByUsername(ctx context.Context, username string) (User, string, error)
	GetUserByID(ctx context.Context, id string) (User, error)
	UpdateUser(ctx context.Context, userID string, updates UserUpdate) (User, error)
}

// RefreshTokenRepository defines the outbound port for managing refresh tokens.
type RefreshTokenRepository interface {
	Save(ctx context.Context, tokenHash string, userID string, expiresAt int64) error
	Get(ctx context.Context, tokenHash string) (string, int64, error)
	Delete(ctx context.Context, tokenHash string) error
}

// TokenService defines the outbound port for signing and verifying tokens using asymmetric keys.
type TokenService interface {
	GenerateTokenPair(ctx context.Context, user User, jkt string) (string, string, error)
	ValidateToken(ctx context.Context, tokenStr string) (*TokenClaims, error)
	IssueRefreshToken(ctx context.Context, userID string) (string, error)
	ValidateRefreshToken(ctx context.Context, refreshToken string) (User, error)
	RevokeRefreshToken(ctx context.Context, token string) error
}
