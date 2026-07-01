package domain

import "context"

type OrderItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Qty   int     `json:"qty"`
	Price float64 `json:"price"`
	Image string  `json:"image"`
}

type OrderTimelineEvent struct {
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
	Description string `json:"description"`
}

type Order struct {
	ID       string               `json:"id"`
	UserID   string               `json:"userId"`
	Status   string               `json:"status"`
	Date     string               `json:"date"`
	Total    float64              `json:"total"`
	Items    []OrderItem          `json:"items"`
	Timeline []OrderTimelineEvent `json:"timeline"`
}

// OrderRepository defines the contract for persisting and retrieving orders.
type OrderRepository interface {
	SaveOrder(ctx context.Context, order Order) error
	GetOrderByID(ctx context.Context, orderID string) (Order, error)
	GetOrdersByUserID(ctx context.Context, userID string) ([]Order, error)
}
