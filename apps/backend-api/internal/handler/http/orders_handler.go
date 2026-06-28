package http

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type OrdersHandler struct{}

func NewOrdersHandler() *OrdersHandler {
	return &OrdersHandler{}
}

type FakeStoreCart struct {
	ID       int    `json:"id"`
	UserID   int    `json:"userId"`
	Date     string `json:"date"`
	Products []struct {
		ProductID int `json:"productId"`
		Quantity  int `json:"quantity"`
	} `json:"products"`
}

type OrderItem struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Qty   int     `json:"qty"`
	Price float64 `json:"price"`
}

type OrderTimelineEvent struct {
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
	Description string `json:"description"`
}

type Order struct {
	ID       string               `json:"id"`
	Status   string               `json:"status"`
	Date     string               `json:"date"`
	Total    float64              `json:"total"`
	Items    []OrderItem          `json:"items"`
	Timeline []OrderTimelineEvent `json:"timeline"`
}

func fetchCarts(w http.ResponseWriter) ([]FakeStoreCart, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://fakestoreapi.com/carts/user/1")
	if err != nil || resp.StatusCode != http.StatusOK {
		http.Error(w, "failed to fetch user carts", http.StatusBadGateway)
		return nil, fmt.Errorf("failed to fetch")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "failed to read response", http.StatusInternalServerError)
		return nil, err
	}

	var carts []FakeStoreCart
	if err := json.Unmarshal(body, &carts); err != nil {
		http.Error(w, "failed to parse carts data", http.StatusInternalServerError)
		return nil, err
	}

	return carts, nil
}

func enrichCartToOrder(cart FakeStoreCart) Order {
	var total float64
	var items []OrderItem

	// Simulating product details
	for _, p := range cart.Products {
		price := float64(p.ProductID) * 10.0 // simulated price
		qty := p.Quantity
		total += price * float64(qty)
		items = append(items, OrderItem{
			ID:    strconv.Itoa(p.ProductID),
			Name:  fmt.Sprintf("Product %d", p.ProductID),
			Qty:   qty,
			Price: price,
		})
	}

	// Simulating status and timeline based on ID parity
	status := "processing"
	if cart.ID%2 == 0 {
		status = "delivered"
	}

	timeline := []OrderTimelineEvent{
		{
			Status:      "processing",
			Timestamp:   cart.Date,
			Description: "Order confirmed",
		},
	}
	if status == "delivered" {
		timeline = append(timeline, OrderTimelineEvent{
			Status:      "delivered",
			Timestamp:   cart.Date,
			Description: "Delivered to customer",
		})
	}

	return Order{
		ID:       fmt.Sprintf("ORD-%d", cart.ID),
		Status:   status,
		Date:     cart.Date,
		Total:    total,
		Items:    items,
		Timeline: timeline,
	}
}

func (h *OrdersHandler) GetOrders(w http.ResponseWriter, r *http.Request) {
	carts, err := fetchCarts(w)
	if err != nil {
		return
	}

	var orders []Order
	for _, cart := range carts {
		orders = append(orders, enrichCartToOrder(cart))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

func (h *OrdersHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")

	carts, err := fetchCarts(w)
	if err != nil {
		return
	}

	for _, cart := range carts {
		orderID := fmt.Sprintf("ORD-%d", cart.ID)
		if orderID == idParam {
			order := enrichCartToOrder(cart)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(order)
			return
		}
	}

	http.Error(w, "Order not found", http.StatusNotFound)
}
