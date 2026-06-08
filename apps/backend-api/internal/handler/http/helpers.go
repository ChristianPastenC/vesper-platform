package http

import (
	"encoding/json"
	"net/http"
)

// ErrorResponse wraps standard HTTP API error formats.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// writeJSON formats a successful response as JSON.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}

// writeError outputs a structured error JSON response.
func writeError(w http.ResponseWriter, status int, errorCode, message string) {
	writeJSON(w, status, ErrorResponse{
		Error:   errorCode,
		Message: message,
	})
}
