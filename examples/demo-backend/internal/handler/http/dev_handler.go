package http

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type DevHandler struct{}

type dpopRequest struct {
	Method string `json:"method"`
	URL    string `json:"url"`
}

// GenerateDPoPToken godoc
// @Summary      Generate a DPoP token for development
// @Description  Generates a DPoP+JWT token signed with a static ECDSA P-256 test key. This endpoint is only available when BUILD_ENV=development.
// @Tags         dev
// @Accept       json
// @Produce      json
// @Param        request body dpopRequest true "Request method and URL"
// @Success      200 {object} map[string]string
// @Router       /api/v1/dev/dpop-token [post]
func (h *DevHandler) GenerateDPoPToken(w http.ResponseWriter, r *http.Request) {
	var req dpopRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	jti := fmt.Sprintf("dev-jti-%d", time.Now().UnixNano())
	token := generateDevDPoP(req.Method, req.URL, jti)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"dpopToken": token,
	})
}

// Uses the same ECDSA P-256 logic as checkout_integration_test.go:generateValidDPoP()
func generateDevDPoP(method, uri, jti string) string {
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
