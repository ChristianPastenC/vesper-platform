package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"


	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/handler/middleware"
)

type OrdersHandler struct {
	orderRepo domain.OrderRepository
}

func NewOrdersHandler(orderRepo domain.OrderRepository) *OrdersHandler {
	return &OrdersHandler{orderRepo: orderRepo}
}

func (h *OrdersHandler) GetOrders(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User identity missing from context")
		return
	}

	orders, err := h.orderRepo.GetOrdersByUserID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to retrieve orders")
		return
	}

	if orders == nil {
		orders = []domain.Order{}
	}

	writeJSON(w, http.StatusOK, orders)
}

func (h *OrdersHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User identity missing from context")
		return
	}

	idParam := chi.URLParam(r, "id")

	order, err := h.orderRepo.GetOrderByID(r.Context(), idParam)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Order not found")
		return
	}

	if order.UserID != userID {
		writeError(w, http.StatusForbidden, "forbidden", "You do not have permission to view this order")
		return
	}

	writeJSON(w, http.StatusOK, order)
}
