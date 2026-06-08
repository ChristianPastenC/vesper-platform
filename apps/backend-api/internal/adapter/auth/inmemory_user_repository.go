package auth

import (
	"context"
	"errors"

	"sovereign-core/backend-api/internal/domain"
)

// InMemoryUserRepository implements domain.AuthRepository.
type InMemoryUserRepository struct {
	users     map[string]domain.User
	passwords map[string]string
}

// NewInMemoryUserRepository initializes the database mock with some test users.
func NewInMemoryUserRepository() *InMemoryUserRepository {
	users := map[string]domain.User{
		"admin": {
			ID:       "usr_admin_99",
			Username: "admin",
			Email:    "admin@sovereign.core",
		},
		"operator": {
			ID:       "usr_op_77",
			Username: "operator",
			Email:    "operator@sovereign.core",
		},
	}

	passwords := map[string]string{
		"admin":    "sovereign_secret",
		"operator": "secure_pass_123",
	}

	return &InMemoryUserRepository{
		users:     users,
		passwords: passwords,
	}
}

// GetUserByUsername retrieves the user details and their credentials for authentication.
func (r *InMemoryUserRepository) GetUserByUsername(ctx context.Context, username string) (domain.User, string, error) {
	user, exists := r.users[username]
	if !exists {
		return domain.User{}, "", errors.New("user_repository: user not found")
	}
	return user, r.passwords[username], nil
}
