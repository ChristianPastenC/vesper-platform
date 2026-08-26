package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"


	"vesper-core/demo-backend/internal/domain"
	"vesper-core/demo-backend/internal/handler/middleware"
)

type OrdersHandler struct {
	orderRepo domain.OrderRepository
}

func NewOrdersHandler(orderRepo domain.OrderRepository) *OrdersHandler {
	return &OrdersHandler{orderRepo: orderRepo}
}

// GetOrders handles GET /api/v1/orders.
// @Summary Get User Orders
// @Description Retrieves all orders for the authenticated user.
// @Tags Orders
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.Order
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders [get]
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

// GetOrder handles GET /api/v1/orders/{id}.
// @Summary Get Order by ID
// @Description Retrieves a specific order by ID for the authenticated user.
// @Tags Orders
// @Produce json
// @Security BearerAuth
// @Param id path string true "Order ID"
// @Success 200 {object} domain.Order
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /orders/{id} [get]
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
