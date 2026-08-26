// Package handlers implements the HTTP handler functions for the SovereignCore backend API.
package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"vesper-core/demo-backend/internal/challenge"
)

// HandshakeResponse is the JSON body returned by a successful POST /api/handshake.
type HandshakeResponse struct {
	// Status is "challenge_issued" on success.
	Status string `json:"status"`

	// ServerTime is the current UTC time at which the challenge was issued.
	ServerTime string `json:"server_time"`

	// Challenge carries the time-variant token the client must echo back.
	Challenge challenge.Token `json:"challenge"`

	// EncodedChallenge is the compact wire-format of the challenge for clients
	// that prefer a single opaque string over the structured JSON fields.
	EncodedChallenge string `json:"encoded_challenge"`
}

// HandshakeVerifyResponse is the JSON body returned by a successful verification.
type HandshakeVerifyResponse struct {
	Status     string `json:"status"`
	Message    string `json:"message"`
	VerifiedAt string `json:"verified_at"`
}

// ErrorResponse wraps a machine-readable error code and a human message.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// HandshakeHandler returns an http.HandlerFunc that:
//   - GET  /api/handshake  → Issues a new time-variant challenge.
//   - POST /api/handshake  → Verifies a previously-issued challenge token
//     supplied in the X-Challenge-Token header.
// @Summary Issue/Verify Challenge
// @Description GET issues a new challenge. POST verifies a challenge.
// @Tags Infrastructure
// @Produce json
// @Param X-Challenge-Token header string false "Required for POST"
// @Success 200 {object} HandshakeResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 405 {object} ErrorResponse
// @Router /api/handshake [get]
// @Router /api/handshake [post]
func HandshakeHandler(iss *challenge.Issuer, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			issueChallenge(w, r, iss, log)
		case http.MethodPost:
			verifyChallenge(w, r, iss, log)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method_not_allowed",
				"Only GET and POST are supported on this endpoint.")
		}
	}
}

// issueChallenge generates and returns a fresh time-variant challenge token.
func issueChallenge(w http.ResponseWriter, r *http.Request, iss *challenge.Issuer, log *slog.Logger) {
	tok, err := iss.Issue()
	if err != nil {
		log.Error("failed to issue challenge", "err", err, "remote", r.RemoteAddr)
		writeError(w, http.StatusInternalServerError, "challenge_generation_failed",
			"The server could not generate a cryptographic challenge. Please retry.")
		return
	}

	resp := HandshakeResponse{
		Status:           "challenge_issued",
		ServerTime:       time.Now().UTC().Format(time.RFC3339),
		Challenge:        tok,
		EncodedChallenge: tok.Encode(),
	}

	log.Info("challenge issued",
		"challenge_id", tok.ChallengeID,
		"expires_at", time.Unix(tok.ExpiresAt, 0).UTC().Format(time.RFC3339),
		"remote", r.RemoteAddr,
	)

	// Expose challenge metadata in response headers for clients that only
	// inspect headers (e.g. mobile SDK pre-flight checks).
	w.Header().Set("X-Challenge-ID", tok.ChallengeID)
	w.Header().Set("X-Challenge-Expires", time.Unix(tok.ExpiresAt, 0).UTC().Format(time.RFC3339))

	writeJSON(w, http.StatusOK, resp)
}

// verifyChallenge validates a challenge token submitted by the client.
// The client must send the encoded challenge in the X-Challenge-Token request header.
func verifyChallenge(w http.ResponseWriter, r *http.Request, iss *challenge.Issuer, log *slog.Logger) {
	encoded := strings.TrimSpace(r.Header.Get("X-Challenge-Token"))
	if encoded == "" {
		writeError(w, http.StatusBadRequest, "missing_challenge_token",
			"The X-Challenge-Token header is required for challenge verification.")
		return
	}

	tok, err := iss.Parse(encoded)
	if err != nil {
		writeError(w, http.StatusBadRequest, "malformed_challenge_token",
			"The supplied X-Challenge-Token could not be parsed.")
		return
	}

	if err := iss.Verify(tok); err != nil {
		switch err {
		case challenge.ErrExpired:
			log.Warn("challenge expired",
				"challenge_id", tok.ChallengeID,
				"remote", r.RemoteAddr,
			)
			writeError(w, http.StatusUnauthorized, "challenge_expired",
				"The cryptographic challenge has expired. Request a new one.")
		case challenge.ErrInvalidSignature:
			log.Warn("challenge signature invalid",
				"challenge_id", tok.ChallengeID,
				"remote", r.RemoteAddr,
			)
			writeError(w, http.StatusUnauthorized, "invalid_signature",
				"Challenge signature verification failed. The token may have been tampered with.")
		default:
			writeError(w, http.StatusUnauthorized, "verification_failed", err.Error())
		}
		return
	}

	log.Info("challenge verified",
		"challenge_id", tok.ChallengeID,
		"remote", r.RemoteAddr,
	)

	writeJSON(w, http.StatusOK, HandshakeVerifyResponse{
		Status:     "channel_verified",
		Message:    "Cryptographic re-handshake successful. Transport channel is authenticated.",
		VerifiedAt: time.Now().UTC().Format(time.RFC3339),
	})
}

// writeJSON serialises v as JSON and writes it with the given HTTP status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}

// writeError is a helper that writes a structured JSON error response.
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, ErrorResponse{Error: code, Message: message})
}
