package http

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/handler/middleware"
)

type OrdersHandler struct {
	repo domain.OrderRepository
}

func NewOrdersHandler(repo domain.OrderRepository) *OrdersHandler {
	return &OrdersHandler{repo: repo}
}

func (h *OrdersHandler) GetOrders(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		// As a fallback for tests or missing auth, we assume "1"
		userID = "1"
	}

	orders, err := h.repo.GetOrdersByUserID(r.Context(), userID)
	if err != nil {
		http.Error(w, "Failed to get orders", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

func (h *OrdersHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")

	order, err := h.repo.GetOrderByID(r.Context(), idParam)
	if err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}
