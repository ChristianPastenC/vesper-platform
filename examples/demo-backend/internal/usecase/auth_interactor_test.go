package usecase_test

import (
	"context"
	"errors"
	"testing"

	"vesper-core/demo-backend/internal/domain"
	"vesper-core/demo-backend/internal/usecase"
)

type mockAuthRepo struct {
	user     domain.User
	password string
	err      error
}

func (m *mockAuthRepo) RegisterUser(ctx context.Context, user domain.User, passwordHash string) error {
	return nil
}

func (m *mockAuthRepo) GetUserByUsername(ctx context.Context, username string) (domain.User, string, error) {
	if m.err != nil {
		return domain.User{}, "", m.err
	}
	return m.user, m.password, nil
}

func (m *mockAuthRepo) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	if m.err != nil {
		return domain.User{}, m.err
	}
	return m.user, nil
}

func (m *mockAuthRepo) UpdateUser(ctx context.Context, userID string, updates domain.UserUpdate) (domain.User, error) {
	return m.user, m.err
}

type mockTokenService struct {
	accessToken  string
	refreshToken string
	err          error
	validUser    domain.User
	validErr     error
}

func (m *mockTokenService) GenerateTokenPair(ctx context.Context, user domain.User, jkt string) (string, string, error) {
	return m.accessToken, m.refreshToken, m.err
}

func (m *mockTokenService) ValidateToken(ctx context.Context, tokenStr string) (*domain.TokenClaims, error) {
	return nil, nil
}

func (m *mockTokenService) IssueRefreshToken(ctx context.Context, userID string) (string, error) {
	return m.refreshToken, m.err
}

func (m *mockTokenService) ValidateRefreshToken(ctx context.Context, refreshToken string) (domain.User, error) {
	return m.validUser, m.validErr
}

func (m *mockTokenService) RevokeRefreshToken(ctx context.Context, token string) error {
	return m.err
}

func TestAuthInteractor_AuthenticateUser(t *testing.T) {
	ctx := context.Background()
	user := domain.User{ID: "1", Username: "testuser"}
	repo := &mockAuthRepo{user: user, password: "$2a$10$OddE2NClmoqtz3M/i0kGNeRlxKjKpkJySNUDUqb3Ucbb7YX6OTPJm"}
	svc := &mockTokenService{}

	interactor := usecase.NewAuthInteractor(repo, svc)

	t.Run("success", func(t *testing.T) {
		res, err := interactor.AuthenticateUser(ctx, "testuser", "password123")
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if res.ID != user.ID {
			t.Errorf("expected user id %s, got %s", user.ID, res.ID)
		}
	})

	t.Run("empty credentials", func(t *testing.T) {
		_, err := interactor.AuthenticateUser(ctx, "", "password123")
		if err == nil {
			t.Fatal("expected error for empty username")
		}
	})

	t.Run("wrong password", func(t *testing.T) {
		_, err := interactor.AuthenticateUser(ctx, "testuser", "wrong")
		if err == nil {
			t.Fatal("expected error for wrong password")
		}
	})

	t.Run("repo error", func(t *testing.T) {
		repo.err = errors.New("db error")
		_, err := interactor.AuthenticateUser(ctx, "testuser", "password123")
		if err == nil {
			t.Fatal("expected error when repo fails")
		}
		repo.err = nil // reset
	})
}

func TestAuthInteractor_GenerateTokenPair(t *testing.T) {
	ctx := context.Background()
	repo := &mockAuthRepo{}
	svc := &mockTokenService{accessToken: "acc", refreshToken: "ref"}

	interactor := usecase.NewAuthInteractor(repo, svc)

	acc, ref, err := interactor.GenerateTokenPair(ctx, domain.User{}, "jkt")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if acc != "acc" || ref != "ref" {
		t.Errorf("expected acc, ref, got %s, %s", acc, ref)
	}

	svc.err = errors.New("svc error")
	_, _, err = interactor.GenerateTokenPair(ctx, domain.User{}, "jkt")
	if err == nil {
		t.Fatal("expected error when token generation fails")
	}
}

func TestAuthInteractor_RefreshTokens(t *testing.T) {
	ctx := context.Background()
	repo := &mockAuthRepo{}
	svc := &mockTokenService{validUser: domain.User{ID: "1"}, accessToken: "new_acc", refreshToken: "new_ref"}

	interactor := usecase.NewAuthInteractor(repo, svc)

	acc, ref, err := interactor.RefreshTokens(ctx, "token", "jkt")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if acc != "new_acc" || ref != "new_ref" {
		t.Errorf("expected new_acc, new_ref, got %s, %s", acc, ref)
	}

	svc.validErr = errors.New("invalid refresh token")
	_, _, err = interactor.RefreshTokens(ctx, "bad_token", "jkt")
	if err == nil {
		t.Fatal("expected error for bad refresh token")
	}
}

func TestAuthInteractor_RegisterUser(t *testing.T) {
	ctx := context.Background()
	repo := &mockAuthRepo{}
	svc := &mockTokenService{}

	interactor := usecase.NewAuthInteractor(repo, svc)

	t.Run("success", func(t *testing.T) {
		req := domain.RegisterRequest{
			Username:  "newuser",
			Email:     "test@example.com",
			Password:  "password123",
			FirstName: "Test",
			LastName:  "User",
		}
		user, err := interactor.RegisterUser(ctx, req)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if user.Username != "newuser" {
			t.Errorf("expected newuser, got %v", user.Username)
		}
	})

	t.Run("invalid email - missing @", func(t *testing.T) {
		req := domain.RegisterRequest{
			Username:  "newuser",
			Email:     "testexample.com",
			Password:  "password123",
		}
		_, err := interactor.RegisterUser(ctx, req)
		if err == nil || err.Error() != "auth_interactor: invalid email format" {
			t.Errorf("expected invalid email format error, got %v", err)
		}
	})

	t.Run("invalid email - missing .", func(t *testing.T) {
		req := domain.RegisterRequest{
			Username:  "newuser",
			Email:     "test@examplecom",
			Password:  "password123",
		}
		_, err := interactor.RegisterUser(ctx, req)
		if err == nil || err.Error() != "auth_interactor: invalid email format" {
			t.Errorf("expected invalid email format error, got %v", err)
		}
	})

	t.Run("email too short", func(t *testing.T) {
		req := domain.RegisterRequest{
			Username:  "newuser",
			Email:     "a@b.",
			Password:  "password123",
		}
		_, err := interactor.RegisterUser(ctx, req)
		if err == nil || err.Error() != "auth_interactor: email too short" {
			t.Errorf("expected email too short error, got %v", err)
		}
	})
}
