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
		"admin":    "$2a$10$OddE2NClmoqtz3M/i0kGNeRlxKjKpkJySNUDUqb3Ucbb7YX6OTPJm",
		"operator": "$2a$10$OddE2NClmoqtz3M/i0kGNeRlxKjKpkJySNUDUqb3Ucbb7YX6OTPJm",
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

// GetUserByID retrieves the user details by ID.
func (r *InMemoryUserRepository) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	for _, user := range r.users {
		if user.ID == id {
			return user, nil
		}
	}
	return domain.User{}, errors.New("user_repository: user not found")
}
