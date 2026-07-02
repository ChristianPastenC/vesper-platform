package domain

import (
	"context"
	"time"
)

type Tenant struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Bcrypt hash
	CreatedAt time.Time `json:"created_at"`
}

type ApiKey struct {
	Key       string    `json:"key"`
	TenantID  string    `json:"tenant_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	LastUsed  time.Time `json:"last_used"`
}

type Metric struct {
	ID         string    `json:"id"`
	TenantID   string    `json:"-"`
	MetricType int       `json:"metric_type"` // 1: Integrity, 2: Latency
	Value      float64   `json:"value"`
	Timestamp  time.Time `json:"timestamp"`
}

type AuthRepository interface {
	CreateTenant(ctx context.Context, tenant Tenant) error
	GetTenantByEmail(ctx context.Context, email string) (*Tenant, error)
	CreateApiKey(ctx context.Context, key ApiKey) error
	GetApiKeysByTenant(ctx context.Context, tenantID string) ([]ApiKey, error)
	ValidateApiKey(ctx context.Context, key string) (*ApiKey, error)
	InsertMetric(ctx context.Context, metric Metric) error
	GetMetricsByTenant(ctx context.Context, tenantID string, limit int) ([]Metric, error)
}
