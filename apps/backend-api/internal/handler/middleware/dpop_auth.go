package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
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

// DPoPClaims represents the payload claims inside the DPoP proof JWT.
type DPoPClaims struct {
	Jti string `json:"jti"`
	Htm string `json:"htm"`
	Htu string `json:"htu"`
	Iat int64  `json:"iat"`
}

// DPoPValidator handles validation rules and replay protection tracking.
type DPoPValidator struct {
	// usedJTIs tracks JTIs by mapping them to their expiry timestamp (Unix)
	usedJTIs sync.Map
}

// NewDPoPValidator initializes a DPoPValidator.
func NewDPoPValidator() *DPoPValidator {
	v := &DPoPValidator{}
	// Launch background cleanup worker for old JTIs
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

// Middleware returns the HTTP middleware handler for validating DPoP headers.
func (d *DPoPValidator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

		// Simple URI matching. Extract scheme and host, or match path.
		// Standard DPoP checks exact match or path. Let's compare path-level or exact string.
		reqURI := r.URL.Path
		// The claim might contain the full URL: e.g. "http://localhost:8080/api/v1/checkout/pay"
		// If htu contains the full URL, we verify that it ends with the request path.
		if !strings.HasSuffix(claims.Htu, reqURI) {
			writeErrorJSON(w, http.StatusUnauthorized, "invalid_dpop_claims", fmt.Sprintf("DPoP HTTP URI mismatch (expected suffix %s, got %s)", reqURI, claims.Htu))
			return
		}

		// 7. Validate iat (Issued At) timestamp: max drift allowed is 120 seconds
		now := time.Now().Unix()
		diff := now - claims.Iat
		if diff < 0 {
			diff = -diff
		}
		if diff > 120 {
			writeErrorJSON(w, http.StatusUnauthorized, "dpop_expired", "DPoP token has expired or clock is out of sync")
			return
		}

		// 8. Replay Protection: verify JTI uniqueness
		if claims.Jti == "" {
			writeErrorJSON(w, http.StatusBadRequest, "invalid_dpop_claims", "Missing JTI claim")
			return
		}

		// Store JTI with expiration set to iat + 120 (when it becomes invalid due to age anyway)
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
	// RFC 7638 requires lexicographic order of the required members: crv, kty, x, y
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
