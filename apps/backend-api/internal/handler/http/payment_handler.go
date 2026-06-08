package http

import (
	"encoding/json"
	"net/http"

	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/handler/middleware"
	"sovereign-core/backend-api/internal/usecase"
)

// PaymentHandler handles transacting payments and orders.
type PaymentHandler struct {
	interactor *usecase.PaymentInteractor
}

// NewPaymentHandler initializes a PaymentHandler.
func NewPaymentHandler(interactor *usecase.PaymentInteractor) *PaymentHandler {
	return &PaymentHandler{
		interactor: interactor,
	}
}

// CheckoutRequest wraps the cart total and card details sent by the client.
type CheckoutRequest struct {
	Total  float64                   `json:"total"`
	Card   domain.CardDetails        `json:"card"`
	Ledger []domain.TransactionBlock `json:"ledger"`
}

// ProcessPayment handles POST /api/v1/checkout/pay. It extracts the authenticated
// user ID from context, parses the cart total and card details, and calls the interactor.
func (h *PaymentHandler) ProcessPayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST requests are allowed on this endpoint")
		return
	}

	// 1. Safely extract user context injected by JWT middleware
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User identity missing from context")
		return
	}

	var req CheckoutRequest
	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse JSON body")
		return
	}

	if req.Total <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "Checkout total must be strictly greater than zero")
		return
	}

	// Fail-fast Domain Validation to aggressively protect egress gateway rate limits
	if len(req.Card.Number) < 13 || len(req.Card.Number) > 19 {
		writeError(w, http.StatusBadRequest, "invalid_card", "Credit card number length is invalid. Aborting early.")
		return
	}
	if req.Card.CVC == "" || len(req.Card.CVC) > 4 {
		writeError(w, http.StatusBadRequest, "invalid_card", "Credit card CVV is malformed. Aborting early.")
		return
	}

	// 2. Validate cryptographic ledger chain
	if !usecase.ValidateLedgerChain(req.Ledger) {
		writeError(w, http.StatusUnprocessableEntity, "invalid_ledger", "Cryptographic chain validation failed")
		return
	}

	// 3. Invoke the business logic interactor
	resp, err := h.interactor.ProcessOrder(r.Context(), req.Total, req.Card)
	if err != nil {
		writeError(w, http.StatusPaymentRequired, "payment_failed", err.Error())
		return
	}

	// 3. Return confirmation response with receipt hash and auditing fields
	writeJSON(w, http.StatusOK, map[string]any{
		"userId":        userID,
		"transactionId": resp.TransactionID,
		"status":        resp.Status,
		"receiptHash":   resp.ReceiptHash,
		"message":       "Transaction processed successfully",
	})
}
