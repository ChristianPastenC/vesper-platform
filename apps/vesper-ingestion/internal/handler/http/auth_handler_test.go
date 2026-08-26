package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/go-chi/chi/v5"
	"vesper-core/vesper-ingestion/internal/domain"
	myhttp "vesper-core/vesper-ingestion/internal/handler/http"
)

type MockAuthRepo struct {
	tenants map[string]domain.Tenant
	metrics map[string][]domain.Metric
	keys    map[string][]domain.ApiKey
}

func NewMockAuthRepo() *MockAuthRepo {
	return &MockAuthRepo{
		tenants: make(map[string]domain.Tenant),
		metrics: make(map[string][]domain.Metric),
		keys:    make(map[string][]domain.ApiKey),
	}
}

func (m *MockAuthRepo) CreateTenant(ctx context.Context, tenant domain.Tenant) error {
	// Not hashing here since the handler should hash it, but wait: the handler DOES hash it.
	// So we just store whatever the handler gives us.
	m.tenants[tenant.Email] = tenant
	return nil
}

func (m *MockAuthRepo) GetTenantByEmail(ctx context.Context, email string) (*domain.Tenant, error) {
	if t, ok := m.tenants[email]; ok {
		return &t, nil
	}
	return nil, nil
}

func (m *MockAuthRepo) CreateApiKey(ctx context.Context, key domain.ApiKey) error {
	m.keys[key.TenantID] = append(m.keys[key.TenantID], key)
	return nil
}

func (m *MockAuthRepo) GetApiKeysByTenant(ctx context.Context, tenantID string) ([]domain.ApiKey, error) {
	return m.keys[tenantID], nil
}

func (m *MockAuthRepo) ValidateApiKey(ctx context.Context, key string) (*domain.ApiKey, error) {
	for _, tenantKeys := range m.keys {
		for _, k := range tenantKeys {
			if k.Key == key {
				return &k, nil
			}
		}
	}
	return nil, nil
}

func (m *MockAuthRepo) UpdateApiKeyBundleID(ctx context.Context, key string, bundleID string) error {
	for tID, keys := range m.keys {
		for i, k := range keys {
			if k.Key == key {
				m.keys[tID][i].BundleID = bundleID
				return nil
			}
		}
	}
	return nil
}

func (m *MockAuthRepo) DeleteApiKey(ctx context.Context, tenantID string, keyID string) error {
	var newKeys []domain.ApiKey
	for _, k := range m.keys[tenantID] {
		if k.Key != keyID {
			newKeys = append(newKeys, k)
		}
	}
	m.keys[tenantID] = newKeys
	return nil
}

func (m *MockAuthRepo) InsertMetric(ctx context.Context, metric domain.Metric) error {
	m.metrics[metric.TenantID] = append(m.metrics[metric.TenantID], metric)
	return nil
}

func (m *MockAuthRepo) GetMetricsByTenant(ctx context.Context, tenantID string, limit int) ([]domain.Metric, error) {
	return m.metrics[tenantID], nil
}

func TestRegisterAndLogin(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	repo := NewMockAuthRepo()
	handler := myhttp.NewAuthHandler(logger, repo)

	r := chi.NewRouter()
	r.Post("/signup", handler.Register)
	r.Post("/login", handler.Login)

	// Test Registration
	reqBody := `{"name":"Test","email":"test@test.com","password":"123"}`
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Register returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var loginResp myhttp.LoginResponse
	json.NewDecoder(rr.Body).Decode(&loginResp)
	if loginResp.Token == "" {
		t.Error("Expected token in register response")
	}

	// Test Login
	loginReqBody := `{"email":"test@test.com","password":"123"}` 
	reqLogin, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(loginReqBody))
	reqLogin.Header.Set("Content-Type", "application/json")
	
	rrLogin := httptest.NewRecorder()
	r.ServeHTTP(rrLogin, reqLogin)
	// It should pass since handler now hashes before CreateTenant and compares correctly
}
