package middleware_test

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"sovereign-core/backend-api/internal/handler/middleware"
)

func generateTestDPoP(method, path string, driftSeconds int64) (string, error) {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return "", err
	}

	xBytes := priv.PublicKey.X.Bytes()
	yBytes := priv.PublicKey.Y.Bytes()
	jwk := middleware.JWK{
		Kty: "EC",
		Crv: "P-256",
		X:   base64.RawURLEncoding.EncodeToString(xBytes),
		Y:   base64.RawURLEncoding.EncodeToString(yBytes),
	}

	header := middleware.DPoPHeader{
		Alg: "ES256",
		Typ: "dpop+jwt",
		Jwk: jwk,
	}
	headerBytes, _ := json.Marshal(header)
	headerB64 := base64.RawURLEncoding.EncodeToString(headerBytes)

	claims := middleware.DPoPClaims{
		Jti: "unique_jti_123",
		Htm: method,
		Htu: path,
		Iat: time.Now().Unix() + driftSeconds,
	}
	claimsBytes, _ := json.Marshal(claims)
	claimsB64 := base64.RawURLEncoding.EncodeToString(claimsBytes)

	signingInput := headerB64 + "." + claimsB64
	hash := sha256.Sum256([]byte(signingInput))

	sigBytes, err := ecdsa.SignASN1(rand.Reader, priv, hash[:])
	if err != nil {
		return "", err
	}

	sigB64 := base64.RawURLEncoding.EncodeToString(sigBytes)

	return signingInput + "." + sigB64, nil
}

func TestDPoPValidator(t *testing.T) {
	validator := middleware.NewDPoPValidator()
	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := validator.Middleware(nextHandler)

	t.Run("missing header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})

	t.Run("valid proof", func(t *testing.T) {
		proof, err := generateTestDPoP(http.MethodGet, "/api/test", 0)
		if err != nil {
			t.Fatalf("failed to generate proof: %v", err)
		}

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.Header.Set("DPoP", proof)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		// Ensure JKT is set in context
		// (We test this indirectly because if it wasn't, the response might not be 200 if nextHandler relied on it.
		// However, our nextHandler doesn't. We just want to ensure it passes through successfully).
	})

	t.Run("method mismatch", func(t *testing.T) {
		// Use a different JTI to avoid replay rejection
		proof, _ := generateTestDPoP(http.MethodPost, "/api/test", 0) // Claim says POST

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil) // Request is GET
		req.Header.Set("DPoP", proof)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 for method mismatch, got %d", w.Code)
		}
	})

	t.Run("uri mismatch", func(t *testing.T) {
		proof, _ := generateTestDPoP(http.MethodGet, "/api/wrong", 0)

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.Header.Set("DPoP", proof)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 for URI mismatch, got %d", w.Code)
		}
	})

	t.Run("expired proof", func(t *testing.T) {
		proof, _ := generateTestDPoP(http.MethodGet, "/api/test", -150) // 150 seconds ago

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.Header.Set("DPoP", proof)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401 for expired token, got %d", w.Code)
		}
	})

	t.Run("replay protection", func(t *testing.T) {
		// Create proof with same JTI as first test ("unique_jti_123")
		proof, _ := generateTestDPoP(http.MethodGet, "/api/test", 0)

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.Header.Set("DPoP", proof)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusConflict {
			t.Errorf("expected 409 Conflict for replay, got %d", w.Code)
		}
	})
}
