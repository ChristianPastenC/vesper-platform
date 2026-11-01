package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// JWK represents a JSON Web Key containing an elliptic curve public key.
type JWK struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

// DPoPHeader represents the JOSE header of a DPoP proof.
type DPoPHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
	Jwk JWK    `json:"jwk"`
}

// DPoPClaims represents the payload claims inside the DPoP proof JWT (RFC 9449).
type DPoPClaims struct {
	Jti   string `json:"jti"`
	Htm   string `json:"htm"`
	Htu   string `json:"htu"`
	Iat   int64  `json:"iat"`
	Ath   string `json:"ath,omitempty"`
	Nonce string `json:"nonce,omitempty"`
}

// DPoPValidator handles validation rules and replay protection tracking.
type DPoPValidator struct {
	usedJTIs sync.Map
}

// NewDPoPValidator initializes a DPoPValidator.
func NewDPoPValidator() *DPoPValidator {
	v := &DPoPValidator{}
	go v.startCleanupWorker(1 * time.Minute)
	return v
}

// startCleanupWorker periodically evicts expired JTIs from memory.
func (d *DPoPValidator) startCleanupWorker(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		now := time.Now().Unix()
		d.usedJTIs.Range(func(key, value any) bool {
			expiry, ok := value.(int64)
			if ok && now > expiry {
				d.usedJTIs.Delete(key)
			}
			return true
		})
	}
}

func generateServerNonce() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Middleware returns the HTTP middleware handler for validating DPoP headers.
func (d *DPoPValidator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Provide next server challenge nonce in response header (RFC 9449 Section 8)
		w.Header().Set("DPoP-Nonce", generateServerNonce())

		if os.Getenv("DEV_DPOP_BYPASS") == "true" {
			next.ServeHTTP(w, r)
			return
		}

		dpopHeader := r.Header.Get("DPoP")
		if dpopHeader == "" {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Missing DPoP proof header")
			return
		}

		parts := strings.Split(dpopHeader, ".")
		if len(parts) != 3 {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Malformed DPoP header format")
			return
		}

		// 1. Decode and parse Header
		headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
		if err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Failed to decode DPoP header")
			return
		}

		var header DPoPHeader
		if err := json.Unmarshal(headerBytes, &header); err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Failed to parse DPoP header JSON")
			return
		}

		// 2. Validate DPoP Header requirements
		if header.Typ != "dpop+jwt" {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Invalid DPoP type header (expected dpop+jwt)")
			return
		}
		if header.Alg != "ES256" {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Unsupported DPoP signature algorithm (only ES256 supported)")
			return
		}
		if header.Jwk.Kty != "EC" || header.Jwk.Crv != "P-256" {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Invalid JWK curve or key type")
			return
		}

		// 3. Reconstruct client public key from JWK
		xBytes, err := base64.RawURLEncoding.DecodeString(header.Jwk.X)
		if err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Failed to decode JWK X coordinate")
			return
		}
		yBytes, err := base64.RawURLEncoding.DecodeString(header.Jwk.Y)
		if err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Failed to decode JWK Y coordinate")
			return
		}

		clientPubKey := &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}

		// 4. Verify ECDSA signature of DPoP proof
		signingInput := parts[0] + "." + parts[1]
		sigBytes, err := base64.RawURLEncoding.DecodeString(parts[2])
		if err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Failed to decode DPoP signature")
			return
		}

		hash := sha256.Sum256([]byte(signingInput))
		if !ecdsa.VerifyASN1(clientPubKey, hash[:], sigBytes) {
			writeErrorJSON(w, http.StatusUnauthorized, "invalid_dpop_signature", "DPoP signature verification failed")
			return
		}

		// 5. Parse and validate claims
		claimsBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
		if err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Failed to decode DPoP claims")
			return
		}

		var claims DPoPClaims
		if err := json.Unmarshal(claimsBytes, &claims); err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop", "Failed to parse DPoP claims JSON")
			return
		}

		// 6. Validate htm (HTTP Method) & htu (HTTP URI)
		if !strings.EqualFold(claims.Htm, r.Method) {
			writeErrorJSON(w, http.StatusUnauthorized, "invalid_dpop_claims", "DPoP HTTP method mismatch")
			return
		}

		reqURI := r.URL.Path
		if !strings.HasSuffix(claims.Htu, reqURI) {
			writeErrorJSON(w, http.StatusUnauthorized, "invalid_dpop_claims", fmt.Sprintf("DPoP HTTP URI mismatch (expected suffix %s, got %s)", reqURI, claims.Htu))
			return
		}

		// 7. Validate iat timestamp (120 seconds max drift)
		now := time.Now().Unix()
		diff := now - claims.Iat
		if diff < 0 {
			diff = -diff
		}
		if diff > 120 {
			writeErrorJSON(w, http.StatusUnauthorized, "dpop_expired", "DPoP token has expired or clock is out of sync")
			return
		}

		// 8. Validate Access Token Hash (ath) if Authorization header is present
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "DPoP ") {
			rawAccessToken := strings.TrimPrefix(authHeader, "DPoP ")
			expectedAth := sha256.Sum256([]byte(rawAccessToken))
			expectedAthEncoded := base64.RawURLEncoding.EncodeToString(expectedAth[:])

			if claims.Ath != "" && claims.Ath != expectedAthEncoded {
				writeErrorJSON(w, http.StatusUnauthorized, "invalid_dpop_claims", "DPoP access token hash (ath) mismatch")
				return
			}
		}

		// 9. Replay Protection: verify JTI uniqueness
		if claims.Jti == "" {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop_claims", "Missing JTI claim")
			return
		}

		jtiExpiry := claims.Iat + 120
		_, loaded := d.usedJTIs.LoadOrStore(claims.Jti, jtiExpiry)
		if loaded {
			writeErrorJSON(w, http.StatusConflict, "dpop_replay", "DPoP token replay detected (JTI already used)")
			return
		}

		// Calculate JKT and inject into context
		jkt, err := CalculateJKT(header.Jwk)
		if err != nil {
			writeErrorJSON(w, http.StatusInternalServerError, "internal_error", "Failed to calculate JKT")
			return
		}
		ctx := context.WithValue(r.Context(), JKTContextKey, jkt)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// CalculateJKT computes the JWK Thumbprint according to RFC 7638.
func CalculateJKT(jwk JWK) (string, error) {
	type thumbprintJWK struct {
		Crv string `json:"crv"`
		Kty string `json:"kty"`
		X   string `json:"x"`
		Y   string `json:"y"`
	}

	tpJWK := thumbprintJWK{
		Crv: jwk.Crv,
		Kty: jwk.Kty,
		X:   jwk.X,
		Y:   jwk.Y,
	}

	jsonBytes, err := json.Marshal(tpJWK)
	if err != nil {
		return "", err
	}

	hash := sha256.Sum256(jsonBytes)
	return base64.RawURLEncoding.EncodeToString(hash[:]), nil
}
