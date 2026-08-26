package usecase

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"sovereign-core/backend-api/internal/domain"
)

// AuthInteractor manages user authentication and secure token issuance.
type AuthInteractor struct {
	repo         domain.AuthRepository
	tokenService domain.TokenService
}

// NewAuthInteractor creates an AuthInteractor.
func NewAuthInteractor(repo domain.AuthRepository, tokenService domain.TokenService) *AuthInteractor {
	return &AuthInteractor{
		repo:         repo,
		tokenService: tokenService,
	}
}

// RegisterUser registers a new user after validating fields and hashing the password.
func (a *AuthInteractor) RegisterUser(ctx context.Context, req domain.RegisterRequest) (domain.User, error) {
	if req.Username == "" || req.Password == "" || req.Email == "" {
		return domain.User{}, errors.New("auth_interactor: username, email and password are required")
	}
	if len(req.Password) < 8 {
		return domain.User{}, errors.New("auth_interactor: password must be at least 8 characters")
	}
	if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
		return domain.User{}, errors.New("auth_interactor: invalid email format")
	}
	if len(req.Email) < 5 {
		return domain.User{}, errors.New("auth_interactor: email too short")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return domain.User{}, fmt.Errorf("auth_interactor: failed to hash password: %w", err)
	}

	nonce := make([]byte, 8)
	rand.Read(nonce)
	user := domain.User{
		ID:        fmt.Sprintf("usr_%x", nonce),
		Username:  req.Username,
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		Avatar:    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
		CreatedAt: time.Now().Unix(),
	}

	if err := a.repo.RegisterUser(ctx, user, string(hash)); err != nil {
		return domain.User{}, err
	}

	return user, nil
}

// AuthenticateUser verifies user credentials against the repository.
func (a *AuthInteractor) AuthenticateUser(ctx context.Context, username, password string) (domain.User, error) {
	if username == "" || password == "" {
		return domain.User{}, errors.New("auth_interactor: username and password cannot be empty")
	}

	user, storedPassword, err := a.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return domain.User{}, err
	}

	// Password verification using bcrypt (cost 12). The stored hash was generated
	// during registration via bcrypt.GenerateFromPassword in RegisterUser.
	if err := bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(password)); err != nil {
		return domain.User{}, errors.New("auth_interactor: invalid credentials")
	}

	return user, nil
}

// GenerateTokenPair generates an asymmetric JWT and a refresh token for an authenticated user.
func (a *AuthInteractor) GenerateTokenPair(ctx context.Context, user domain.User, jkt string) (string, string, error) {
	accessToken, refreshToken, err := a.tokenService.GenerateTokenPair(ctx, user, jkt)
	if err != nil {
		return "", "", err
	}
	return accessToken, refreshToken, nil
}

// RefreshTokens validates the refresh token and issues a new token pair.
func (a *AuthInteractor) RefreshTokens(ctx context.Context, refreshToken string, jkt string) (string, string, error) {
	user, err := a.tokenService.ValidateRefreshToken(ctx, refreshToken)
	if err != nil {
		return "", "", err
	}
	return a.tokenService.GenerateTokenPair(ctx, user, jkt)
}
