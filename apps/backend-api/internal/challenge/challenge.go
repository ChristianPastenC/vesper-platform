// Package challenge implements the time-variant cryptographic challenge mechanism
// used by the SovereignCore /api/handshake endpoint.
//
// # Design
//
// Each challenge is a short-lived token composed of:
//   - A randomly-generated 32-byte nonce (hex-encoded)
//   - A precise UTC expiry timestamp (Unix epoch, seconds)
//   - An HMAC-SHA256 signature over "nonce:expiry" using a server-side secret
//
// Clients must echo back the challenge within its TTL window for verification
// to succeed. Because the signature binds both the nonce and the expiry time,
// altering either field invalidates the token — preventing replay attacks and
// time-extension forgeries.
package challenge

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// DefaultTTL is the lifetime of a freshly-issued challenge.
const DefaultTTL = 2 * time.Minute

// ErrExpired is returned when a challenge has passed its expiry window.
var ErrExpired = errors.New("challenge: token has expired")

// ErrInvalidSignature is returned when the HMAC verification fails.
var ErrInvalidSignature = errors.New("challenge: invalid signature")

// ErrMalformed is returned when the token string cannot be parsed.
var ErrMalformed = errors.New("challenge: malformed token")

// Token represents a single, signed, time-variant challenge.
type Token struct {
	// Nonce is the hex-encoded random 32-byte value unique to this challenge.
	Nonce string `json:"nonce"`

	// ExpiresAt is the UTC Unix epoch second at which this challenge becomes invalid.
	ExpiresAt int64 `json:"expires_at"`

	// IssuedAt is the UTC Unix epoch second at which the challenge was generated.
	IssuedAt int64 `json:"issued_at"`

	// Signature is the hex-encoded HMAC-SHA256 over "nonce:expires_at".
	Signature string `json:"signature"`

	// ChallengeID is a human-readable compact identifier derived from the first
	// 8 bytes of the nonce — useful for correlation in distributed traces.
	ChallengeID string `json:"challenge_id"`
}

// Issuer issues and verifies time-variant challenge tokens.
type Issuer struct {
	secret []byte
	ttl    time.Duration
}

// NewIssuer creates an Issuer that signs challenges with secret and expires
// them after ttl. If ttl is zero, DefaultTTL is used.
func NewIssuer(secret []byte, ttl time.Duration) *Issuer {
	if ttl == 0 {
		ttl = DefaultTTL
	}
	return &Issuer{secret: secret, ttl: ttl}
}

// Issue generates a new challenge Token.
func (iss *Issuer) Issue() (Token, error) {
	rawNonce := make([]byte, 32)
	if _, err := rand.Read(rawNonce); err != nil {
		return Token{}, fmt.Errorf("challenge: failed to generate nonce: %w", err)
	}

	now := time.Now().UTC()
	nonce := hex.EncodeToString(rawNonce)
	expiresAt := now.Add(iss.ttl).Unix()
	issuedAt := now.Unix()

	sig := sign(iss.secret, nonce, expiresAt)

	return Token{
		Nonce:       nonce,
		ExpiresAt:   expiresAt,
		IssuedAt:    issuedAt,
		Signature:   sig,
		ChallengeID: nonce[:16], // first 8 raw bytes → 16 hex chars
	}, nil
}

// Verify checks that t is structurally valid, not expired, and carries a
// correct HMAC signature. It returns a typed sentinel error on failure.
func (iss *Issuer) Verify(t Token) error {
	// 1. Signature check first — constant-time comparison via hmac.Equal.
	expected := sign(iss.secret, t.Nonce, t.ExpiresAt)
	if !hmac.Equal([]byte(t.Signature), []byte(expected)) {
		return ErrInvalidSignature
	}

	// 2. Expiry check — only after the signature is confirmed valid.
	if time.Now().UTC().Unix() >= t.ExpiresAt {
		return ErrExpired
	}

	return nil
}

// Parse reconstructs a Token from its compact wire representation produced by
// Token.Encode. Returns ErrMalformed if the string cannot be parsed.
func (iss *Issuer) Parse(encoded string) (Token, error) {
	parts := strings.SplitN(encoded, ".", 4)
	if len(parts) != 4 {
		return Token{}, ErrMalformed
	}

	expiresAt, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return Token{}, ErrMalformed
	}
	issuedAt, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		return Token{}, ErrMalformed
	}

	t := Token{
		Nonce:       parts[0],
		ExpiresAt:   expiresAt,
		IssuedAt:    issuedAt,
		Signature:   parts[3],
		ChallengeID: parts[0][:16],
	}
	return t, nil
}

// Encode serialises the Token into a compact dot-separated wire format:
//
//	<nonce>.<expires_at>.<issued_at>.<signature>
//
// This format is intentionally simple — no base64 padding, no JWT overhead.
func (t Token) Encode() string {
	return fmt.Sprintf("%s.%d.%d.%s", t.Nonce, t.ExpiresAt, t.IssuedAt, t.Signature)
}

// RemainingTTL returns the duration until this challenge expires.
// Returns 0 if the token is already expired.
func (t Token) RemainingTTL() time.Duration {
	remaining := time.Until(time.Unix(t.ExpiresAt, 0).UTC())
	if remaining < 0 {
		return 0
	}
	return remaining
}

// sign produces a hex-encoded HMAC-SHA256 over "nonce:expiresAt".
func sign(secret []byte, nonce string, expiresAt int64) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(fmt.Sprintf("%s:%d", nonce, expiresAt)))
	return hex.EncodeToString(mac.Sum(nil))
}
