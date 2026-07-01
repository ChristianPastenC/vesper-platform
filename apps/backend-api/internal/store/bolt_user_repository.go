package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"go.etcd.io/bbolt"

	"sovereign-core/backend-api/internal/domain"
)

type storedUser struct {
	domain.User
	PasswordHash string `json:"passwordHash"`
}

type BoltUserRepository struct {
	db *bbolt.DB
}

func NewBoltUserRepository(db *bbolt.DB) *BoltUserRepository {
	return &BoltUserRepository{db: db}
}

func (r *BoltUserRepository) GetUserByUsername(ctx context.Context, username string) (domain.User, string, error) {
	var user storedUser
	var found bool

	err := r.db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(UsersBucket))
		if b == nil {
			return errors.New("store: users bucket not found")
		}
		data := b.Get([]byte(username))
		if data == nil {
			return nil
		}
		if err := json.Unmarshal(data, &user); err != nil {
			return fmt.Errorf("failed to unmarshal user: %w", err)
		}
		found = true
		return nil
	})

	if err != nil {
		return domain.User{}, "", err
	}
	if !found {
		return domain.User{}, "", errors.New("user_repository: user not found")
	}

	return user.User, user.PasswordHash, nil
}

func (r *BoltUserRepository) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	var username string
	var user domain.User

	err := r.db.View(func(tx *bbolt.Tx) error {
		bIdx := tx.Bucket([]byte(UsersByIDBucket))
		if bIdx == nil {
			return errors.New("store: users_by_id bucket not found")
		}

		uBytes := bIdx.Get([]byte(id))
		if uBytes == nil {
			return errors.New("user_repository: user not found")
		}
		username = string(uBytes)

		bUsers := tx.Bucket([]byte(UsersBucket))
		data := bUsers.Get([]byte(username))
		if data == nil {
			return errors.New("user_repository: user not found")
		}

		var su storedUser
		if err := json.Unmarshal(data, &su); err != nil {
			return err
		}
		user = su.User
		return nil
	})

	if err != nil {
		return domain.User{}, err
	}
	return user, nil
}

func (r *BoltUserRepository) RegisterUser(ctx context.Context, user domain.User, passwordHash string) error {
	return r.db.Update(func(tx *bbolt.Tx) error {
		bUsers := tx.Bucket([]byte(UsersBucket))
		bIdx := tx.Bucket([]byte(UsersByIDBucket))

		if bUsers == nil || bIdx == nil {
			return errors.New("store: buckets not initialized")
		}

		// Check if username already exists
		if bUsers.Get([]byte(user.Username)) != nil {
			return errors.New("user_repository: username already taken")
		}

		su := storedUser{
			User:         user,
			PasswordHash: passwordHash,
		}

		data, err := json.Marshal(su)
		if err != nil {
			return err
		}

		if err := bUsers.Put([]byte(user.Username), data); err != nil {
			return err
		}

		if err := bIdx.Put([]byte(user.ID), []byte(user.Username)); err != nil {
			return err
		}

		return nil
	})
}
