package usecase

import (
	"context"
	"errors"

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

// AuthenticateUser verifies user credentials against the repository.
func (a *AuthInteractor) AuthenticateUser(ctx context.Context, username, password string) (domain.User, error) {
	if username == "" || password == "" {
		return domain.User{}, errors.New("auth_interactor: username and password cannot be empty")
	}

	user, storedPassword, err := a.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return domain.User{}, err
	}

	// Simple password verification. In a real-world system, use bcrypt/argon2.
	// For this baseline, we do a simple string comparison against the mock data.
	if password != storedPassword {
		return domain.User{}, errors.New("auth_interactor: invalid credentials")
	}

	return user, nil
}

// GenerateTokenPair generates an asymmetric JWT and a refresh token for an authenticated user.
func (a *AuthInteractor) GenerateTokenPair(ctx context.Context, user domain.User) (string, string, error) {
	accessToken, refreshToken, err := a.tokenService.GenerateTokenPair(ctx, user)
	if err != nil {
		return "", "", err
	}
	return accessToken, refreshToken, nil
}
