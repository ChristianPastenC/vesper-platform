package auth

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// jwtSecret reads the signing secret from JWT_SECRET env var.
// Panics at startup if the value is missing or shorter than 32 bytes —
// this prevents the server from ever running with a weak or empty secret.
func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if len(s) < 32 {
		panic("[auth] JWT_SECRET env var must be set and at least 32 characters long")
	}
	return []byte(s)
}

const tokenTTL = 24 * time.Hour

// SignToken mints a signed HS256 JWT for the given tenantID.
// The token carries "sub" (tenantID), "iat", and "exp" standard claims.
func SignToken(tenantID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": tenantID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(tokenTTL).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

// ValidateTenant parses and validates a JWT from the Authorization header.
// Returns the tenantID from the "sub" claim, or an error if the token is
// expired, tampered with, or signed with a different algorithm/key.
func ValidateTenant(authHeader string) (string, error) {
	if authHeader == "" {
		return "", errors.New("missing Authorization header")
	}

	raw := authHeader
	const prefix = "Bearer "
	if len(authHeader) > len(prefix) && authHeader[:len(prefix)] == prefix {
		raw = authHeader[len(prefix):]
	}

	token, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) {
		// Reject any algorithm other than HS256 — prevents algorithm confusion attacks
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret(), nil
	}, jwt.WithValidMethods([]string{"HS256"}))

	if err != nil || !token.Valid {
		return "", errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("malformed claims")
	}

	sub, err := claims.GetSubject()
	if err != nil || sub == "" {
		return "", errors.New("missing subject claim")
	}

	return sub, nil
}
