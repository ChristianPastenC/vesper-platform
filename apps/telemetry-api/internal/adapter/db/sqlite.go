package db

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"

	"sovereign-core/telemetry-api/internal/domain"
)

type SQLiteRepository struct {
	db     *sql.DB
	logger *slog.Logger
}

func NewSQLiteRepository(logger *slog.Logger, dbPath string) (*SQLiteRepository, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	repo := &SQLiteRepository{db: db, logger: logger}
	if err := repo.migrate(); err != nil {
		return nil, err
	}
	
	// Seed demo tenant if not exists
	repo.seedDemoTenant()

	return repo, nil
}

func (r *SQLiteRepository) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS tenants (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS api_keys (
		key TEXT PRIMARY KEY,
		tenant_id TEXT NOT NULL,
		name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_used DATETIME,
		FOREIGN KEY (tenant_id) REFERENCES tenants(id)
	);
	`
	_, err := r.db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	return nil
}

func (r *SQLiteRepository) seedDemoTenant() {
	var count int
	r.db.QueryRow("SELECT COUNT(*) FROM tenants WHERE email = 'demo@sovereign.local'").Scan(&count)
	if count == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("demo123"), bcrypt.DefaultCost)
		r.db.Exec(`INSERT INTO tenants (id, name, email, password) VALUES (?, ?, ?, ?)`,
			"tenant_demo_001", "Demo Corp", "demo@sovereign.local", string(hash))
		r.db.Exec(`INSERT INTO api_keys (key, tenant_id, name) VALUES (?, ?, ?)`,
			"sk_test_demo123", "tenant_demo_001", "Default Key")
	}
}

func (r *SQLiteRepository) CreateTenant(ctx context.Context, tenant domain.Tenant) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(tenant.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, 
		`INSERT INTO tenants (id, name, email, password) VALUES (?, ?, ?, ?)`,
		tenant.ID, tenant.Name, tenant.Email, string(hash))
	return err
}

func (r *SQLiteRepository) GetTenantByEmail(ctx context.Context, email string) (*domain.Tenant, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, name, email, password, created_at FROM tenants WHERE email = ?`, email)
	var t domain.Tenant
	if err := row.Scan(&t.ID, &t.Name, &t.Email, &t.Password, &t.CreatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *SQLiteRepository) CreateApiKey(ctx context.Context, key domain.ApiKey) error {
	_, err := r.db.ExecContext(ctx, 
		`INSERT INTO api_keys (key, tenant_id, name, created_at, last_used) VALUES (?, ?, ?, ?, ?)`,
		key.Key, key.TenantID, key.Name, key.CreatedAt, key.LastUsed)
	return err
}

func (r *SQLiteRepository) GetApiKeysByTenant(ctx context.Context, tenantID string) ([]domain.ApiKey, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT key, tenant_id, name, created_at, last_used FROM api_keys WHERE tenant_id = ?`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []domain.ApiKey
	for rows.Next() {
		var k domain.ApiKey
		var lastUsed sql.NullTime
		if err := rows.Scan(&k.Key, &k.TenantID, &k.Name, &k.CreatedAt, &lastUsed); err != nil {
			return nil, err
		}
		if lastUsed.Valid {
			k.LastUsed = lastUsed.Time
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func (r *SQLiteRepository) ValidateApiKey(ctx context.Context, key string) (*domain.ApiKey, error) {
	row := r.db.QueryRowContext(ctx, `SELECT key, tenant_id, name, created_at, last_used FROM api_keys WHERE key = ?`, key)
	var k domain.ApiKey
	var lastUsed sql.NullTime
	if err := row.Scan(&k.Key, &k.TenantID, &k.Name, &k.CreatedAt, &lastUsed); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if lastUsed.Valid {
		k.LastUsed = lastUsed.Time
	}

	// Update last used asynchronously
	go func() {
		r.db.Exec(`UPDATE api_keys SET last_used = ? WHERE key = ?`, time.Now(), key)
	}()

	return &k, nil
}
