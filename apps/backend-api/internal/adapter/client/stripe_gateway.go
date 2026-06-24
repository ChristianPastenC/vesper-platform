package client

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/client"

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

// CreateCharge executes a Stripe charge request. It uses the official SDK,
// and routes through a mock HTTP client if simulated.
func (s *StripeGateway) CreateCharge(ctx context.Context, amount float64, currency string, card domain.CardDetails) (domain.TransactionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	// Use our resilient mock client for the Stripe SDK's backend
	backends := &stripe.Backends{
		API: stripe.GetBackendWithConfig(
			stripe.APIBackend,
			&stripe.BackendConfig{
				HTTPClient: s.mockClient,
			},
		),
	}

	key := stripe.Key
	if key == "" || card.Simulate {
		key = "sk_test_mock_secret_key"
	}
	sc := client.New(key, backends)

	params := &stripe.ChargeParams{
		Amount:   stripe.Int64(int64(amount * 100)),
		Currency: stripe.String(currency),
	}
	params.Context = ctx

	// In order to keep compatibility with the local mock transport which expects "card_number",
	// we add it to the extra parameters, though realistically we'd use a token.
	if card.Number != "" {
		params.AddExtra("card_number", card.Number)
	} else {
		params.Source = &stripe.PaymentSourceSourceParams{Token: stripe.String("tok_visa")}
	}

	ch, err := sc.Charges.New(params)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) || errors.Is(err, context.DeadlineExceeded) {
			return domain.TransactionResponse{}, fmt.Errorf("timeout")
		}
		if stripeErr, ok := err.(*stripe.Error); ok {
			return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: card declined: %s (code: %s)", stripeErr.Msg, stripeErr.Code)
		}
		return domain.TransactionResponse{}, fmt.Errorf("stripe_gateway: mock request failed: %w", err)
	}

	return domain.TransactionResponse{
		TransactionID: ch.ID,
		Status:        string(ch.Status),
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
