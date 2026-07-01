package http_test

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"sovereign-core/backend-api/internal/domain"
	apiHTTP "sovereign-core/backend-api/internal/handler/http"
	"sovereign-core/backend-api/internal/handler/middleware"
	"sovereign-core/backend-api/internal/usecase"
)

type mockIntegrationTokenService struct{}

func (m *mockIntegrationTokenService) GenerateTokenPair(ctx context.Context, user domain.User, jkt string) (string, string, error) {
	return "valid-access", "valid-refresh", nil
}

func (m *mockIntegrationTokenService) ValidateToken(ctx context.Context, token string) (*domain.TokenClaims, error) {
	return &domain.TokenClaims{UserID: "test_user"}, nil
}

func (m *mockIntegrationTokenService) ValidateRefreshToken(ctx context.Context, refreshToken string) (domain.User, error) {
	return domain.User{ID: "test_user"}, nil
}

type mockIntegrationOrderRepo struct{}

func (m *mockIntegrationOrderRepo) SaveOrder(ctx context.Context, order domain.Order) error {
	return nil
}
func (m *mockIntegrationOrderRepo) GetOrderByID(ctx context.Context, orderID string) (domain.Order, error) {
	return domain.Order{}, nil
}
func (m *mockIntegrationOrderRepo) GetOrdersByUserID(ctx context.Context, userID string) ([]domain.Order, error) {
	return nil, nil
}

func TestCheckoutIntegration_RouterComplete(t *testing.T) {
	// 1. Build an httptest.Server with the full router (without middleware mocks).
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Mocking Gateway for the Interactor
	gw := &mockPaymentGateway{
		resp: domain.TransactionResponse{
			TransactionID: "tx_integrated_123",
			Status:        "success",
		},
	}
	repo := &mockIntegrationOrderRepo{}
	interactor := usecase.NewPaymentInteractor(gw, repo)
	idempMgr := middleware.NewIdempotencyManager()
	paymentHandler := apiHTTP.NewPaymentHandler(interactor, idempMgr)

	cfg := apiHTTP.RouterConfig{
		Log:                logger,
		TokenService:       &mockIntegrationTokenService{},
		PaymentHandler:     paymentHandler,
		IdempotencyManager: idempMgr,
	}

	secretKey := "test-secret-key"
	os.Setenv("PAYLOAD_SECRET_KEY", secretKey)
	defer os.Unsetenv("PAYLOAD_SECRET_KEY")

	// Real router with all injected middlewares
	router := apiHTTP.NewRouter(cfg)

	// Build a valid 2-block ledger
	raw0 := fmt.Sprintf(`"payload0"0%d`, 1000)
	hash0 := fmt.Sprintf("%x", sha256.Sum256([]byte(raw0)))

	raw1 := fmt.Sprintf(`"payload1"%s%d`, hash0, 2000)
	hash1 := fmt.Sprintf("%x", sha256.Sum256([]byte(raw1)))

	validBody := fmt.Sprintf(`{
		"total": 100.0,
		"card": {
			"number": "4242424242424242",
			"cvc": "123"
		},
		"ledger": [
			{
				"precedingHash": "0",
				"payload": "\"payload0\"",
				"timestamp": 1000,
				"hash": "%s"
			},
			{
				"precedingHash": "%s",
				"payload": "\"payload1\"",
				"timestamp": 2000,
				"hash": "%s"
			}
		]
	}`, hash0, hash0, hash1)

	// 2. Send POST /api/v1/checkout/pay with a valid 2-block ledger and verify 200 OK
	t.Run("Valid Ledger", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBufferString(validBody))

		// Setup Headers required by middleware
		req.Header.Set("Authorization", "Bearer valid-token")
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Idempotency-Key", "idemp-key-1")
		req.Header.Set("DPoP", generateValidDPoP(http.MethodPost, "/api/v1/checkout/pay", "jti-1"))

		mac := hmac.New(sha256.New, []byte(secretKey))
		mac.Write([]byte(validBody))
		req.Header.Set("X-Sovereign-Hash", hex.EncodeToString(mac.Sum(nil)))

		// 4. Use httptest.NewRecorder() and the injected router directly
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 OK, got %d. Body: %s", w.Code, w.Body.String())
		} else {
			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)
			if resp["transactionId"] == nil || resp["transactionId"] == "" {
				t.Errorf("Expected transactionId to not be empty")
			}
		}
	})

	// 3. Send the same request with altered block 1 hash and verify 422
	t.Run("Invalid Ledger - Altered Hash", func(t *testing.T) {
		invalidBody := fmt.Sprintf(`{
		"total": 100.0,
		"card": {
			"number": "4242424242424242",
			"cvc": "123"
		},
		"ledger": [
			{
				"precedingHash": "0",
				"payload": "\"payload0\"",
				"timestamp": 1000,
				"hash": "%s"
			},
			{
				"precedingHash": "%s",
				"payload": "\"payload1\"",
				"timestamp": 2000,
				"hash": "invalid_altered_hash"
			}
		]
	}`, hash0, hash0)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/checkout/pay", bytes.NewBufferString(invalidBody))
		req.Header.Set("Authorization", "Bearer valid-token")
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Idempotency-Key", "idemp-key-2")
		req.Header.Set("DPoP", generateValidDPoP(http.MethodPost, "/api/v1/checkout/pay", "jti-2"))

		mac := hmac.New(sha256.New, []byte(secretKey))
		mac.Write([]byte(invalidBody))
		req.Header.Set("X-Sovereign-Hash", hex.EncodeToString(mac.Sum(nil)))

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("Expected 422 Unprocessable Entity, got %d", w.Code)
		}

		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		if resp["error"] != "invalid_ledger" {
			t.Errorf("Expected error to be 'invalid_ledger', got %v", resp["error"])
		}
	})
}

func generateValidDPoP(method, uri, jti string) string {
	priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	header := fmt.Sprintf(`{"alg":"ES256","typ":"dpop+jwt","jwk":{"kty":"EC","crv":"P-256","x":"%s","y":"%s"}}`,
		base64.RawURLEncoding.EncodeToString(priv.X.Bytes()),
		base64.RawURLEncoding.EncodeToString(priv.Y.Bytes()))
	headerB64 := base64.RawURLEncoding.EncodeToString([]byte(header))
	claims := fmt.Sprintf(`{"jti":"%s","htm":"%s","htu":"%s","iat":%d}`, jti, method, uri, time.Now().Unix())
	claimsB64 := base64.RawURLEncoding.EncodeToString([]byte(claims))
	signingInput := headerB64 + "." + claimsB64
	hash := sha256.Sum256([]byte(signingInput))
	sig, _ := ecdsa.SignASN1(rand.Reader, priv, hash[:])
	return signingInput + "." + base64.RawURLEncoding.EncodeToString(sig)
}
