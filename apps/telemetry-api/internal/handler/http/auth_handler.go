package http

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"sovereign-core/telemetry-api/internal/domain"
)

type AuthHandler struct {
	logger *slog.Logger
	repo   domain.AuthRepository
}

func NewAuthHandler(logger *slog.Logger, repo domain.AuthRepository) *AuthHandler {
	return &AuthHandler{
		logger: logger,
		repo:   repo,
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token    string         `json:"token"`
	TenantID string         `json:"tenant_id"`
	Name     string         `json:"name"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	tenant, err := h.repo.GetTenantByEmail(r.Context(), req.Email)
	if err != nil || tenant == nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(tenant.Password), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// For simplicity in this demo, we'll return a pseudo-token (the tenant ID signed/encrypted in production)
	// The frontend will pass this pseudo-token in Authorization header to manage keys.
	res := LoginResponse{
		Token:    "session_" + tenant.ID, // Mock JWT
		TenantID: tenant.ID,
		Name:     tenant.Name,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "Fields cannot be empty", http.StatusBadRequest)
		return
	}

	existing, _ := h.repo.GetTenantByEmail(r.Context(), req.Email)
	if existing != nil {
		http.Error(w, "Email already in use", http.StatusConflict)
		return
	}

	newTenant := domain.Tenant{
		ID:        "tenant_" + uuid.NewString(),
		Name:      req.Name,
		Email:     req.Email,
		Password:  req.Password,
		CreatedAt: time.Now(),
	}

	if err := h.repo.CreateTenant(r.Context(), newTenant); err != nil {
		h.logger.Error("Failed to register tenant", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	res := LoginResponse{
		Token:    "session_" + newTenant.ID,
		TenantID: newTenant.ID,
		Name:     newTenant.Name,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

type CreateKeyRequest struct {
	Name string `json:"name"`
}

func (h *AuthHandler) CreateKey(w http.ResponseWriter, r *http.Request) {
	// Simple auth check from "session_" token
	token := r.Header.Get("Authorization")
	if len(token) < 9 || token[:8] != "session_" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	tenantID := token[8:]

	var req CreateKeyRequest
	json.NewDecoder(r.Body).Decode(&req)
	if req.Name == "" {
		req.Name = "Default Key"
	}

	newKey := domain.ApiKey{
		Key:       "sk_" + uuid.NewString(),
		TenantID:  tenantID,
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	if err := h.repo.CreateApiKey(r.Context(), newKey); err != nil {
		h.logger.Error("Failed to create api key", "error", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newKey)
}

func (h *AuthHandler) ListKeys(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if len(token) < 9 || token[:8] != "session_" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	tenantID := token[8:]

	keys, err := h.repo.GetApiKeysByTenant(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("Failed to list keys", "error", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if keys == nil {
		keys = []domain.ApiKey{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(keys)
}

func (h *AuthHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if len(token) < 9 || token[:8] != "session_" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	tenantID := token[8:]

	metrics, err := h.repo.GetMetricsByTenant(r.Context(), tenantID, 30) // max 30 points
	if err != nil {
		h.logger.Error("Failed to list metrics", "error", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	if metrics == nil {
		metrics = []domain.Metric{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}
