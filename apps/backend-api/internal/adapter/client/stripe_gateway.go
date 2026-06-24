package client

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/stripe/stripe-go/v79"
	"github.com/stripe/stripe-go/v79/charge"

	"sovereign-core/backend-api/internal/domain"
)

// StripeGateway implements domain.PaymentGateway using the official Stripe SDK
// or a mock transport fallback.
type StripeGateway struct {
	mockClient *http.Client
}

// NewStripeGateway initializes a StripeGateway.
func NewStripeGateway() (*StripeGateway, error) {
	gateway := &StripeGateway{
		mockClient: &http.Client{
			Timeout:   5 * time.Second,
			Transport: NewResilientRoundTripper(&stripeMockTransport{}),
		},
	}

	key := os.Getenv("STRIPE_SECRET_KEY")
	if key == "" {
		slog.Error("STRIPE_SECRET_KEY is absent")
		return gateway, errors.New("stripe_gateway: missing STRIPE_SECRET_KEY")
	}

	stripe.Key = key
	return gateway, nil
}

// CreateCharge executes a Stripe charge request. It uses the official SDK if configured,
// otherwise falls back to the mock if simulated or if the key is missing.
func (s *StripeGateway) CreateCharge(ctx context.Context, amount float64, currency string, card domain.CardDetails) (domain.TransactionResponse, error) {
	// Fallback to mock if simulated or if we don't have an API key configured.
	if card.Simulate || stripe.Key == "" {
		return s.mockCreateCharge(ctx, amount, currency, card)
	}

	// 3. Official SDK implementation for sandbox
	params := &stripe.ChargeParams{
		Amount:   stripe.Int64(int64(amount * 100)),
		Currency: stripe.String(currency),
		Source:   &stripe.PaymentSourceSourceParams{Token: stripe.String("tok_visa")}, // Sandbox token
	}
	params.Context = ctx

	ch, err := charge.New(params)
	if err != nil {
		// 5. Handle stripeErr *stripe.Error and return typed errors
		if stripeErr, ok := err.(*stripe.Error); ok {
			return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: card declined: %s (code: %s)", stripeErr.Msg, stripeErr.Code)
		}
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: request failed: %w", err)
	}

	// 4. Map the result stripe.Charge to domain.TransactionResponse
	return domain.TransactionResponse{
		TransactionID: ch.ID,
		Status:        string(ch.Status),
	}, nil
}

// mockCreateCharge executes a simulated Stripe charge using the mock transport.
func (s *StripeGateway) mockCreateCharge(ctx context.Context, amount float64, currency string, card domain.CardDetails) (domain.TransactionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	reqURL := "https://api.stripe.com/v1/charges"
	payload := fmt.Sprintf("amount=%d&currency=%s&card_number=%s", int(amount*100), currency, card.Number)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, strings.NewReader(payload))
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: failed to create mock request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer sk_test_mock_secret_key")

	resp, err := s.mockClient.Do(req)
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: mock request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))
	if err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: failed to read mock response: %w", err)
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
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: mock transaction failed with status %d", resp.StatusCode)
	}

	var stripeResp struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(bodyBytes, &stripeResp); err != nil {
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: failed to parse mock stripe response: %w", err)
	}

	return domain.TransactionResponse{
		TransactionID: stripeResp.ID,
		Status:        stripeResp.Status,
	}, nil
}

// stripeMockTransport simulates Stripe's API server.
type stripeMockTransport struct{}

func (t *stripeMockTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	bodyBytes, err := io.ReadAll(req.Body)
	if err != nil {
		return nil, err
	}
	req.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	bodyStr := string(bodyBytes)

	authHeader := req.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return makeJSONResponse(http.StatusUnauthorized, `{
			"error": {
				"message": "Missing or invalid authorization header",
				"type": "invalid_request_error"
			}
		}`), nil
	}

	cardNumber := ""
	for _, part := range strings.Split(bodyStr, "&") {
		if strings.HasPrefix(part, "card_number=") {
			cardNumber = strings.TrimPrefix(part, "card_number=")
		}
	}

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

	if strings.Contains(cardNumber, "0000") {
		return makeJSONResponse(http.StatusPaymentRequired, `{
			"error": {
				"message": "Your card was declined.",
				"code": "card_declined",
				"type": "card_error"
			}
		}`), nil
	}

	return nil, errors.New("stripe_gateway: mock request failed (no card match)")
}

func makeJSONResponse(statusCode int, body string) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}
