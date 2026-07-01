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
	idempMgr   *middleware.IdempotencyManager
}

// NewPaymentHandler initializes a PaymentHandler.
func NewPaymentHandler(interactor *usecase.PaymentInteractor, idempMgr *middleware.IdempotencyManager) *PaymentHandler {
	return &PaymentHandler{
		interactor: interactor,
		idempMgr:   idempMgr,
	}
}

// CheckoutRequest wraps the cart total and card details sent by the client.
type CheckoutRequest struct {
	Total   float64                   `json:"total"`
	Card    domain.CardDetails        `json:"card"`
	Ledger  []domain.TransactionBlock `json:"ledger"`
	Items   []domain.OrderItem        `json:"items"`
	UseMock bool                      `json:"use_mock,omitempty"`
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
	if len(req.Ledger) > 0 {
		if !usecase.ValidateLedgerChain(req.Ledger) {
			writeError(w, http.StatusUnprocessableEntity, "invalid_ledger", "Cryptographic chain validation failed")
			return
		}
	}

	orderType := "online"
	if r.URL.Path == "/api/v1/checkout/instore" {
		orderType = "instore"
	}

	// 3. Invoke the business logic interactor
	resp, err := h.interactor.ProcessOrder(r.Context(), userID, req.Total, req.Card, req.Items, orderType)
	if err != nil {
		writeError(w, http.StatusPaymentRequired, "payment_failed", err.Error())
		return
	}

	// 4. Return confirmation response with receipt hash and auditing fields
	writeJSON(w, http.StatusOK, map[string]any{
		"userId":        userID,
		"transactionId": resp.TransactionID,
		"status":        resp.Status,
		"receiptHash":   resp.ReceiptHash,
		"message":       "Transaction processed successfully",
	})
}

type SyncTransaction struct {
	TransactionID string `json:"transactionId"`
	domain.TransactionBlock
}

type SyncRequest struct {
	Transactions []SyncTransaction `json:"transactions"`
}

type SyncResult struct {
	TransactionID string `json:"transactionId"`
	ReceiptHash   string `json:"receiptHash,omitempty"`
	Status        string `json:"status"`
	Error         string `json:"error,omitempty"`
}

type SyncResponse struct {
	Synced  int          `json:"synced"`
	Failed  int          `json:"failed"`
	Results []SyncResult `json:"results"`
}

func (h *PaymentHandler) SyncOfflinePayments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST requests are allowed on this endpoint")
		return
	}

	var req SyncRequest
	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024*5)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse JSON body")
		return
	}

	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User identity missing from context")
		return
	}

	blocks := make([]domain.TransactionBlock, 0, len(req.Transactions))
	for _, tx := range req.Transactions {
		blocks = append(blocks, tx.TransactionBlock)
	}

	var results []SyncResult
	var synced, failed int

	for i, tx := range req.Transactions {
		// 1. Valida la cadena criptográfica
		if !usecase.ValidateLedgerChain(blocks[:i+1]) {
			results = append(results, SyncResult{
				TransactionID: tx.TransactionID,
				Status:        "failed",
				Error:         "invalid_ledger_block",
			})
			failed++
			continue
		}



		// MockGateway.CreateCharge and OrderRepo.SaveOrder is done by interactor
		resp, err := h.interactor.SyncOfflineTransaction(r.Context(), userID, tx.TransactionID, tx.Payload)
		if err != nil {
			results = append(results, SyncResult{
				TransactionID: tx.TransactionID,
				Status:        "failed",
				Error:         err.Error(),
			})
			failed++
			continue
		}

		results = append(results, SyncResult{
			TransactionID: tx.TransactionID,
			ReceiptHash:   resp.ReceiptHash,
			Status:        resp.Status,
		})
		synced++
	}

	writeJSON(w, http.StatusOK, SyncResponse{
		Synced:  synced,
		Failed:  failed,
		Results: results,
	})
}
