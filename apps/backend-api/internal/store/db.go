package store

import (
	"fmt"
	"path/filepath"
	"os"

	"go.etcd.io/bbolt"
)

const (
	OrdersBucket       = "orders"
	OrdersByUserBucket = "orders_by_user"
)

// OpenDB initializes the bbolt database and ensures required buckets exist.
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

	err = db.Update(func(tx *bbolt.Tx) error {
		if _, err := tx.CreateBucketIfNotExists([]byte(OrdersBucket)); err != nil {
			return fmt.Errorf("create bucket %s: %w", OrdersBucket, err)
		}
		if _, err := tx.CreateBucketIfNotExists([]byte(OrdersByUserBucket)); err != nil {
			return fmt.Errorf("create bucket %s: %w", OrdersByUserBucket, err)
		}
		return nil
	})

	if err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}
