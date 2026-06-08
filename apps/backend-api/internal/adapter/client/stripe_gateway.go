package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"sovereign-core/backend-api/internal/domain"
)

// StripeGateway implements domain.PaymentGateway by mocking Stripe API calls.
type StripeGateway struct {
	client *http.Client
}

// NewStripeGateway initializes a StripeGateway with an http.Client containing
// a custom RoundTripper that intercepts HTTP requests and returns mock sandbox responses.
func NewStripeGateway() *StripeGateway {
	return &StripeGateway{
		client: &http.Client{
			Timeout:   5 * time.Second,
			Transport: NewResilientRoundTripper(&stripeMockTransport{}),
		},
	}
}

// CreateCharge executes a simulated Stripe charge request, handling timeouts
// and context cancellation, and returns a transaction result.
func (s *StripeGateway) CreateCharge(ctx context.Context, amount float64, currency string, card domain.CardDetails) (domain.TransactionResponse, error) {
	// Prepare URL and body to look like a real Stripe integration
	reqURL := "https://api.stripe.com/v1/charges"
	
	// Create post payload simulating form urlencoding
	payload := fmt.Sprintf("amount=%d&currency=%s&card_number=%s", int(amount*100), currency, card.Number)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, strings.NewReader(payload))
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer sk_test_mock_secret_key")

	resp, err := s.client.Do(req)
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var stripeErr struct {
			Error struct {
				Message string `json:"message"`
				Code    string `json:"code"`
			} `json:"error"`
		}
		if err := json.Unmarshal(bodyBytes, &stripeErr); err == nil && stripeErr.Error.Message != "" {
			return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: card declined: %s (code: %s)", stripeErr.Error.Message, stripeErr.Error.Code)
		}
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: transaction failed with status %d", resp.StatusCode)
	}

	var stripeResp struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(bodyBytes, &stripeResp); err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: failed to parse stripe response: %w", err)
	}

	return domain.TransactionResponse{
		TransactionID: stripeResp.ID,
		Status:        stripeResp.Status,
	}, nil
}

// stripeMockTransport simulates Stripe's API server.
type stripeMockTransport struct{}

func (t *stripeMockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Parse request data to determine response
	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		return nil, err
	}
	req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	bodyStr := string(bodyBytes)

	// Validate authorization header
	authHeader := req.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return makeJSONResponse(http.StatusUnauthorized, `{
			"error": {
				"message": "Missing or invalid authorization header",
				"type": "invalid_request_error"
			}
		}`), nil
	}

	// Extract card number from request body
	cardNumber := ""
	for _, part := range strings.Split(bodyStr, "&") {
		if strings.HasPrefix(part, "card_number=") {
			cardNumber = strings.TrimPrefix(part, "card_number=")
		}
	}

	// Implement sandbox behavior based on card number
	// 4242 is Stripe's standard successful test card.
	if strings.Contains(cardNumber, "4242") || cardNumber == "" {
		txID := fmt.Sprintf("ch_%d", time.Now().UnixNano())
		successJSON := fmt.Sprintf(`{
			"id": "%s",
			"object": "charge",
			"amount": 2000,
			"currency": "usd",
			"status": "succeeded",
			"paid": true
		}`, txID)
		return makeJSONResponse(http.StatusOK, successJSON), nil
	}

	// If card number contains "0000", simulate card decline
	if strings.Contains(cardNumber, "0000") {
		return makeJSONResponse(http.StatusPaymentRequired, `{
			"error": {
				"message": "Your card was declined.",
				"code": "card_declined",
				"type": "card_error"
			}
		}`), nil
	}

	// Any other card returns standard generic failure
	return nil, errors.New("stripe_gateway: network timeout simulation (no card match)")
}

func makeJSONResponse(statusCode int, body string) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}
