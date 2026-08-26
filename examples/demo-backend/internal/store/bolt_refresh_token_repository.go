package store

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"go.etcd.io/bbolt"
)

type RefreshTokenData struct {
	UserID    string `json:"userId"`
	ExpiresAt int64  `json:"expiresAt"`
}

type BoltRefreshTokenRepository struct {
	db *bbolt.DB
}

func NewBoltRefreshTokenRepository(db *bbolt.DB) *BoltRefreshTokenRepository {
	repo := &BoltRefreshTokenRepository{db: db}
	go repo.startCleanupWorker()
	return repo
}

func (r *BoltRefreshTokenRepository) Save(ctx context.Context, tokenHash string, userID string, expiresAt int64) error {
	return r.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(RefreshTokensBucket))
		if b == nil {
			return errors.New("store: refresh_tokens bucket not found")
		}

		data := RefreshTokenData{
			UserID:    userID,
			ExpiresAt: expiresAt,
		}
		bytes, err := json.Marshal(data)
		if err != nil {
			return err
		}

		return b.Put([]byte(tokenHash), bytes)
	})
}

func (r *BoltRefreshTokenRepository) Get(ctx context.Context, tokenHash string) (string, int64, error) {
	var userID string
	var expiresAt int64
	err := r.db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(RefreshTokensBucket))
		if b == nil {
			return errors.New("store: refresh_tokens bucket not found")
		}

		bytes := b.Get([]byte(tokenHash))
		if bytes == nil {
			return errors.New("store: token not found")
		}

		var data RefreshTokenData
		if err := json.Unmarshal(bytes, &data); err != nil {
			return err
		}

		userID = data.UserID
		expiresAt = data.ExpiresAt
		return nil
	})

	return userID, expiresAt, err
}

func (r *BoltRefreshTokenRepository) Delete(ctx context.Context, tokenHash string) error {
	return r.db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(RefreshTokensBucket))
		if b == nil {
			return errors.New("store: refresh_tokens bucket not found")
		}
		return b.Delete([]byte(tokenHash))
	})
}

func (r *BoltRefreshTokenRepository) startCleanupWorker() {
	ticker := time.NewTicker(1 * time.Hour)
	for range ticker.C {
		err := r.db.Update(func(tx *bbolt.Tx) error {
			b := tx.Bucket([]byte(RefreshTokensBucket))
			if b == nil {
				return nil
			}

			c := b.Cursor()
			var keysToDelete [][]byte

			for k, v := c.First(); k != nil; k, v = c.Next() {
				var data RefreshTokenData
				if err := json.Unmarshal(v, &data); err == nil {
					if time.Now().Unix() > data.ExpiresAt {
						keysToDelete = append(keysToDelete, k)
					}
				}
			}

			for _, k := range keysToDelete {
				if err := b.Delete(k); err != nil {
					log.Printf("store: failed to delete expired refresh token: %v", err)
				}
			}
			return nil
		})
		if err != nil {
			log.Printf("store: refresh token cleanup failed: %v", err)
		}
	}
}
