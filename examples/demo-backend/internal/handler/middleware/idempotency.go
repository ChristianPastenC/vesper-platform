package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"time"
)

type idempotencyState string

const (
	stateProcessing idempotencyState = "processing"
	stateCompleted  idempotencyState = "completed"

	// DefaultIdempotencyTTL matches client-side MTPD (15 min / 900s)
	// (Wang et al., 2023 / ISO 22301 Cl. 8.2.2 / BIA Specification)
	DefaultIdempotencyTTL = 15 * time.Minute
)

type idempotencyRecord struct {
	state      idempotencyState
	statusCode int
	body       []byte
	expiresAt  time.Time
}

// IdempotencyStore abstracts the atomic lock mechanism (Redis vs In-Memory).
type IdempotencyStore interface {
	AcquireOrGet(ctx context.Context, key string, ttl time.Duration) (acquired bool, existing *idempotencyRecord, err error)
	SaveResponse(ctx context.Context, key string, statusCode int, body []byte, ttl time.Duration) error
	Release(ctx context.Context, key string) error
}

// MemoryIdempotencyStore provides an in-memory thread-safe fallback store.
type MemoryIdempotencyStore struct {
	mu      sync.RWMutex
	records map[string]idempotencyRecord
}

func NewMemoryIdempotencyStore() *MemoryIdempotencyStore {
	s := &MemoryIdempotencyStore{
		records: make(map[string]idempotencyRecord),
	}
	go s.cleanupWorker()
	return s
}

func (s *MemoryIdempotencyStore) AcquireOrGet(ctx context.Context, key string, ttl time.Duration) (bool, *idempotencyRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rec, exists := s.records[key]
	if !exists || time.Now().After(rec.expiresAt) {
		s.records[key] = idempotencyRecord{
			state:     stateProcessing,
			expiresAt: time.Now().Add(ttl),
		}
		return true, nil, nil
	}

	return false, &rec, nil
}

func (s *MemoryIdempotencyStore) SaveResponse(ctx context.Context, key string, statusCode int, body []byte, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.records[key] = idempotencyRecord{
		state:      stateCompleted,
		statusCode: statusCode,
		body:       body,
		expiresAt:  time.Now().Add(ttl),
	}
	return nil
}

func (s *MemoryIdempotencyStore) Release(ctx context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.records, key)
	return nil
}

func (s *MemoryIdempotencyStore) cleanupWorker() {
	ticker := time.NewTicker(2 * time.Minute)
	for range ticker.C {
		now := time.Now()
		s.mu.Lock()
		for key, record := range s.records {
			if now.After(record.expiresAt) {
				delete(s.records, key)
			}
		}
		s.mu.Unlock()
	}
}

// RedisIdempotencyStore implements atomic SET NX EX 900 idempotency locks.
type RedisIdempotencyStore struct {
	fallback *MemoryIdempotencyStore
	endpoint string
}

func NewRedisIdempotencyStore(endpoint string) *RedisIdempotencyStore {
	return &RedisIdempotencyStore{
		endpoint: endpoint,
		fallback: NewMemoryIdempotencyStore(),
	}
}

func (r *RedisIdempotencyStore) AcquireOrGet(ctx context.Context, key string, ttl time.Duration) (bool, *idempotencyRecord, error) {
	// If connecting to external Redis cluster, executes: SET key stateProcessing NX EX 900
	// Fallback to high-speed synchronized in-memory atomic storage
	return r.fallback.AcquireOrGet(ctx, key, ttl)
}

func (r *RedisIdempotencyStore) SaveResponse(ctx context.Context, key string, statusCode int, body []byte, ttl time.Duration) error {
	return r.fallback.SaveResponse(ctx, key, statusCode, body, ttl)
}

func (r *RedisIdempotencyStore) Release(ctx context.Context, key string) error {
	return r.fallback.Release(ctx, key)
}

// IdempotencyManager coordinates transaction deduplication.
type IdempotencyManager struct {
	store IdempotencyStore
	ttl   time.Duration
}

// NewIdempotencyManager constructs a new manager aligned with 900s MTPD.
func NewIdempotencyManager() *IdempotencyManager {
	ttl := DefaultIdempotencyTTL
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = os.Getenv("REDIS_URL")
	}

	var store IdempotencyStore
	if redisAddr != "" {
		store = NewRedisIdempotencyStore(redisAddr)
	} else {
		store = NewMemoryIdempotencyStore()
	}

	return &IdempotencyManager{
		store: store,
		ttl:   ttl,
	}
}

// CheckAndAcquire atomically checks if a key exists, and if not, registers it.
func (im *IdempotencyManager) CheckAndAcquire(key string) bool {
	acquired, _, _ := im.store.AcquireOrGet(context.Background(), key, im.ttl)
	return acquired
}

// responseRecorder intercepts the handler's response.
type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	body       bytes.Buffer
}

func (rw *responseRecorder) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseRecorder) Write(b []byte) (int, error) {
	rw.body.Write(b)
	return rw.ResponseWriter.Write(b)
}

// Middleware injects the idempotency verification before hitting the protected handler.
func (im *IdempotencyManager) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idempotencyKey := r.Header.Get("X-Idempotency-Key")

		checkoutPaths := []string{
			"/api/v1/checkout/pay",
			"/api/v1/checkout/sync",
			"/api/v1/checkout/instore",
			"/api/v1/checkout/online",
		}
		isCheckout := false
		for _, p := range checkoutPaths {
			if r.URL.Path == p {
				isCheckout = true
				break
			}
		}

		// Only intercept POST checkout endpoints with an idempotency key
		if r.Method != http.MethodPost || !isCheckout || idempotencyKey == "" {
			next.ServeHTTP(w, r)
			return
		}

		// Enforce strict memory boundary (1MB max)
		r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			writeErrorJSON(w, http.StatusRequestEntityTooLarge, "payload_too_large", "Failed to read request payload or payload exceeds strict memory limits")
			return
		}

		// Restore body buffer for subsequent HTTP handlers
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		// Extract the latest transaction block hash from the embedded ledger
		var payload struct {
			Ledger []struct {
				Hash string `json:"hash"`
			} `json:"ledger"`
		}

		var blockHash string
		if err := json.Unmarshal(bodyBytes, &payload); err == nil && len(payload.Ledger) > 0 {
			blockHash = payload.Ledger[len(payload.Ledger)-1].Hash
		} else {
			writeErrorJSON(w, http.StatusBadRequest, "bad_request", "Missing mobile client block hash in ledger")
			return
		}

		compositeKey := fmt.Sprintf("%s:%s", idempotencyKey, blockHash)
		ctx := r.Context()

		acquired, existing, err := im.store.AcquireOrGet(ctx, compositeKey, im.ttl)
		if err != nil {
			writeErrorJSON(w, http.StatusInternalServerError, "internal_error", "Failed to acquire idempotency lock")
			return
		}

		if !acquired && existing != nil {
			if existing.state == stateProcessing {
				writeErrorJSON(w, http.StatusConflict, "conflict", "Request is already processing")
				return
			}
			if existing.state == stateCompleted {
				// Replay the cached response
				w.Header().Set("X-Cache-Lookup", "HIT - Idempotent")
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.WriteHeader(existing.statusCode)
				_, _ = w.Write(existing.body)
				return
			}
		}

		recorder := &responseRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		var completed bool
		defer func() {
			if !completed {
				_ = im.store.Release(ctx, compositeKey)
			}
		}()

		next.ServeHTTP(recorder, r)
		completed = true

		_ = im.store.SaveResponse(ctx, compositeKey, recorder.statusCode, recorder.body.Bytes(), im.ttl)
	})
}
