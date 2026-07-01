package http

import (
	"encoding/json"
	"net/http"

	"sovereign-core/backend-api/internal/domain"
	"sovereign-core/backend-api/internal/handler/middleware"
	"sovereign-core/backend-api/internal/usecase"
)

// AuthHandler handles HTTP requests targeting authorization endpoints.
type AuthHandler struct {
	interactor *usecase.AuthInteractor
}

// NewAuthHandler initializes an AuthHandler with an AuthInteractor.
func NewAuthHandler(interactor *usecase.AuthInteractor) *AuthHandler {
	return &AuthHandler{
		interactor: interactor,
	}
}

// Register handles POST /api/v1/auth/register.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST requests are allowed on this endpoint")
		return
	}

	var req domain.RegisterRequest
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse JSON body")
		return
	}

	user, err := h.interactor.RegisterUser(r.Context(), req)
	if err != nil {
		if err.Error() == "user_repository: username already taken" {
			writeError(w, http.StatusConflict, "conflict", "Username already taken")
			return
		}
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	jkt, _ := middleware.GetJKTFromContext(r.Context())
	accessToken, refreshToken, err := h.interactor.GenerateTokenPair(r.Context(), user, jkt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token_generation_failed", err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
	writeJSON(w, http.StatusCreated, map[string]any{
		"user":         user,
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
	})
}

// Login handles POST /api/v1/auth/login. It parses incoming credentials,
// authenticates the user against the database, and issues an ECDSA JWT.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST requests are allowed on this endpoint")
		return
	}

	var creds domain.UserCredentials

	// Enforce strict memory boundary (e.g., 64KB max) to prevent OOM Denial of Service attacks
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse JSON body or payload too large")
		return
	}

	user, err := h.interactor.AuthenticateUser(r.Context(), creds.Username, creds.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", err.Error())
		return
	}

	jkt, _ := middleware.GetJKTFromContext(r.Context())
	accessToken, refreshToken, err := h.interactor.GenerateTokenPair(r.Context(), user, jkt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "token_generation_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user":         user,
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
	})
}

// Refresh handles POST /api/v1/auth/refresh.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST requests are allowed on this endpoint")
		return
	}

	var req domain.RefreshRequest

	// Enforce strict memory boundary (e.g., 64KB max) to prevent OOM Denial of Service attacks
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse JSON body or payload too large")
		return
	}

	if req.RefreshToken == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "Missing refresh_token")
		return
	}

	jkt, _ := middleware.GetJKTFromContext(r.Context())
	accessToken, refreshToken, err := h.interactor.RefreshTokens(r.Context(), req.RefreshToken, jkt)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
	})
}
