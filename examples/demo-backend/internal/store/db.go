package store

import (
	"fmt"
	"os"
	"path/filepath"

	"go.etcd.io/bbolt"
)

const (
	UsersBucket        = "users"
	UsersByIDBucket    = "users_by_id"
	OrdersBucket       = "orders"
	OrdersByUserBucket = "orders_by_user"
	RefreshTokensBucket = "refresh_tokens"
)

// OpenDB initializes the bbolt database.
func OpenDB(dbPath string) (*bbolt.DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("store: failed to create db directory: %w", err)
	}

	db, err := bbolt.Open(dbPath, 0600, nil)
	if err != nil {
		return nil, fmt.Errorf("store: failed to open bbolt database: %w", err)
	}

	return db, nil
}

// InitBuckets creates the required buckets if they do not exist.
func InitBuckets(db *bbolt.DB) error {
	return db.Update(func(tx *bbolt.Tx) error {
		buckets := []string{
			UsersBucket,
			UsersByIDBucket,
			OrdersBucket,
			OrdersByUserBucket,
			RefreshTokensBucket,
		}

		for _, b := range buckets {
			if _, err := tx.CreateBucketIfNotExists([]byte(b)); err != nil {
				return fmt.Errorf("create bucket %s: %w", b, err)
			}
		}
		return nil
	})
}
