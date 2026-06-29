package http

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
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
	Image string  `json:"image"`
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
		log.Printf("orders_handler: failed to fetch user carts: %v", err)
		return getFallbackCarts(), nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("orders_handler: failed to read response: %v", err)
		return getFallbackCarts(), nil
	}

	var carts []FakeStoreCart
	if err := json.Unmarshal(body, &carts); err != nil {
		log.Printf("orders_handler: failed to parse carts data: %v", err)
		return getFallbackCarts(), nil
	}

	return carts, nil
}

func getFallbackCarts() []FakeStoreCart {
	return []FakeStoreCart{
		{
			ID:     101,
			UserID: 1,
			Date:   time.Now().Format(time.RFC3339),
			Products: []struct {
				ProductID int `json:"productId"`
				Quantity  int `json:"quantity"`
			}{
				{ProductID: 1, Quantity: 1},
				{ProductID: 2, Quantity: 1},
			},
		},
		{
			ID:     102,
			UserID: 1,
			Date:   time.Now().AddDate(0, -1, -5).Format(time.RFC3339),
			Products: []struct {
				ProductID int `json:"productId"`
				Quantity  int `json:"quantity"`
			}{
				{ProductID: 3, Quantity: 2},
			},
		},
	}
}

func enrichCartToOrder(cart FakeStoreCart) Order {
	var total float64
	var items []OrderItem

	// Simulating product details with varied data
	mockProducts := map[int]OrderItem{
		1: {ID: "1", Name: "Premium Wireless Headphones", Price: 299.99, Image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop"},
		2: {ID: "2", Name: "Sovereign Obsidian Smartwatch", Price: 199.50, Image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop"},
		3: {ID: "3", Name: "Men's Minimalist T-Shirt", Price: 25.00, Image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop"},
	}

	for _, p := range cart.Products {
		product, exists := mockProducts[p.ProductID]
		if !exists {
			product = OrderItem{
				ID:    strconv.Itoa(p.ProductID),
				Name:  fmt.Sprintf("Product %d", p.ProductID),
				Price: float64(p.ProductID) * 10.0,
				Image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop",
			}
		}
		
		qty := p.Quantity
		total += product.Price * float64(qty)
		
		product.Qty = qty
		items = append(items, product)
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
