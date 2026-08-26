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

// @Summary Login tenant
// @Description Authenticate a tenant and receive a session token
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} LoginResponse
// @Failure 400 {string} string "Invalid request format"
// @Failure 401 {string} string "Invalid credentials"
// @Failure 500 {string} string "Internal server error"
// @Router /api/v1/b2b/login [post]
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

// @Summary Register tenant
// @Description Register a new B2B tenant
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 200 {object} LoginResponse
// @Failure 400 {string} string "Invalid request format"
// @Failure 409 {string} string "Email already in use"
// @Failure 500 {string} string "Internal server error"
// @Router /api/v1/b2b/signup [post]
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

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	newTenant := domain.Tenant{
		ID:        "tenant_" + uuid.NewString(),
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hash),
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
	Name     string `json:"name"`
	BundleID string `json:"bundle_id"`
}

// @Summary Create API Key
// @Description Create a new API key for the tenant (Max 1)
// @Tags Auth
// @Accept json
// @Produce json
// @Param Authorization header string true "Session token (e.g. session_tenantID)"
// @Param request body CreateKeyRequest true "API Key details"
// @Success 200 {string} string "Created"
// @Failure 401 {string} string "Unauthorized"
// @Failure 409 {string} string "API Key limit reached"
// @Failure 500 {string} string "Internal error"
// @Router /api/v1/b2b/keys [post]
func (h *AuthHandler) CreateKey(w http.ResponseWriter, r *http.Request) {
	// Simple auth check from "session_" token
	token := r.Header.Get("Authorization")
	if len(token) < 9 || token[:8] != "session_" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	tenantID := token[8:]

	// Limit to 1 Key
	keys, err := h.repo.GetApiKeysByTenant(r.Context(), tenantID)
	if err == nil && len(keys) >= 1 {
		http.Error(w, "API Key limit reached. Please revoke existing key.", http.StatusConflict)
		return
	}

	var req CreateKeyRequest
	json.NewDecoder(r.Body).Decode(&req)
	if req.Name == "" {
		req.Name = "Default Key"
	}

	newKey := domain.ApiKey{
		Key:       "sk_" + uuid.NewString(),
		TenantID:  tenantID,
		Name:      req.Name,
		BundleID:  "", // TOFU: Blank until first use
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

// @Summary List API Keys
// @Description List all API keys for the tenant
// @Tags Auth
// @Produce json
// @Param Authorization header string true "Session token"
// @Success 200 {array} domain.ApiKey
// @Failure 401 {string} string "Unauthorized"
// @Failure 500 {string} string "Internal error"
// @Router /api/v1/b2b/keys [get]
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

// @Summary Get Metrics
// @Description Get telemetry metrics for the tenant
// @Tags Metrics
// @Produce json
// @Param Authorization header string true "Session token"
// @Success 200 {array} domain.Metric
// @Failure 401 {string} string "Unauthorized"
// @Failure 500 {string} string "Internal error"
// @Router /api/v1/b2b/metrics [get]
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

type DeleteKeyRequest struct {
	Key string `json:"key"`
}

// @Summary Delete API Key
// @Description Revoke an API key
// @Tags Auth
// @Param Authorization header string true "Session token"
// @Param key query string true "API Key to delete"
// @Success 200 {string} string "OK"
// @Failure 400 {string} string "Key is required"
// @Failure 401 {string} string "Unauthorized"
// @Failure 500 {string} string "Internal error"
// @Router /api/v1/b2b/keys [delete]
func (h *AuthHandler) DeleteKey(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if len(token) < 9 || token[:8] != "session_" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	tenantID := token[8:]

	keyID := r.URL.Query().Get("key")
	if keyID == "" {
		http.Error(w, "Key is required", http.StatusBadRequest)
		return
	}

	if err := h.repo.DeleteApiKey(r.Context(), tenantID, keyID); err != nil {
		h.logger.Error("Failed to delete key", "error", err)
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// @Summary Server Ping
// @Description Wake up or health check
// @Tags System
// @Produce json
// @Success 200 {string} string "OK"
// @Router /api/v1/support/ping [get]
func (h *AuthHandler) Ping(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
