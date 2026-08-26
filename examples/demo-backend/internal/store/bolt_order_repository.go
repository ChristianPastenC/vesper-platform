package store

import (
	"context"
	"encoding/json"
	"fmt"

	"vesper-core/demo-backend/internal/domain"

	"go.etcd.io/bbolt"
)

type BoltOrderRepository struct {
	db *bbolt.DB
}

func NewBoltOrderRepository(db *bbolt.DB) *BoltOrderRepository {
	return &BoltOrderRepository{db: db}
}

func (r *BoltOrderRepository) SaveOrder(ctx context.Context, order domain.Order) error {
	return r.db.Update(func(tx *bbolt.Tx) error {
		ordersBucket := tx.Bucket([]byte(OrdersBucket))
		usersBucket := tx.Bucket([]byte(OrdersByUserBucket))

		if ordersBucket == nil || usersBucket == nil {
			return fmt.Errorf("store: buckets not initialized")
		}

		data, err := json.Marshal(order)
		if err != nil {
			return fmt.Errorf("store: failed to marshal order: %w", err)
		}

		// Save in orders bucket
		if err := ordersBucket.Put([]byte(order.ID), data); err != nil {
			return fmt.Errorf("store: failed to save order: %w", err)
		}

		// Save in orders_by_user bucket
		if order.UserID != "" {
			key := fmt.Sprintf("%s:%s", order.UserID, order.ID)
			if err := usersBucket.Put([]byte(key), []byte(order.ID)); err != nil {
				return fmt.Errorf("store: failed to save user index: %w", err)
			}
		}

		return nil
	})
}

func (r *BoltOrderRepository) GetOrderByID(ctx context.Context, orderID string) (domain.Order, error) {
	var order domain.Order
	err := r.db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(OrdersBucket))
		if b == nil {
			return fmt.Errorf("store: bucket not initialized")
		}
		data := b.Get([]byte(orderID))
		if data == nil {
			return fmt.Errorf("order not found")
		}
		return json.Unmarshal(data, &order)
	})
	return order, err
}

func (r *BoltOrderRepository) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	var orders []domain.Order
	err := r.db.View(func(tx *bbolt.Tx) error {
		usersBucket := tx.Bucket([]byte(OrdersByUserBucket))
		ordersBucket := tx.Bucket([]byte(OrdersBucket))

		if usersBucket == nil || ordersBucket == nil {
			return fmt.Errorf("store: buckets not initialized")
		}

		prefix := []byte(userID + ":")
		c := usersBucket.Cursor()

		for k, v := c.Seek(prefix); k != nil && string(k[:len(prefix)]) == string(prefix); k, v = c.Next() {
			data := ordersBucket.Get(v)
			if data != nil {
				var o domain.Order
				if err := json.Unmarshal(data, &o); err == nil {
					orders = append(orders, o)
				}
			}
		}
		return nil
	})
	
	if orders == nil {
		orders = []domain.Order{}
	}
	return orders, err
}
