package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"sync"
	"time"
)

type idempotencyState string

const (
	stateProcessing idempotencyState = "processing"
	stateCompleted  idempotencyState = "completed"
)

type idempotencyRecord struct {
	state      idempotencyState
	statusCode int
	body       []byte
	expiresAt  time.Time
}

// IdempotencyManager provides in-memory thread-safe idempotency tracking.
type IdempotencyManager struct {
	mu      sync.RWMutex
	records map[string]idempotencyRecord
}

// NewIdempotencyManager constructs and starts a new idempotency manager.
func NewIdempotencyManager() *IdempotencyManager {
	im := &IdempotencyManager{
		records: make(map[string]idempotencyRecord),
	}
	// Start cleanup worker to respect the 1-hour TTL
	go im.cleanupWorker()
	return im
}

func (im *IdempotencyManager) cleanupWorker() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		now := time.Now()
		im.mu.Lock()
		for key, record := range im.records {
			if now.After(record.expiresAt) {
				delete(im.records, key)
			}
		}
		im.mu.Unlock()
	}
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
		
		// Only intercept POST /api/v1/checkout/pay with an idempotency key
		if r.Method != http.MethodPost || r.URL.Path != "/api/v1/checkout/pay" || idempotencyKey == "" {
			next.ServeHTTP(w, r)
			return
		}

		// Read and hash the request body to prevent payload alterations
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			writeErrorJSON(w, http.StatusBadRequest, "bad_request", "Failed to read request body")
			return
		}
		
		// Restore body for subsequent handlers
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		hash := sha256.Sum256(bodyBytes)
		hashStr := hex.EncodeToString(hash[:])
		compositeKey := idempotencyKey + ":" + hashStr

		im.mu.Lock()
		record, exists := im.records[compositeKey]
		if !exists {
			// Register as processing with 1 hour TTL
			im.records[compositeKey] = idempotencyRecord{
				state:     stateProcessing,
				expiresAt: time.Now().Add(1 * time.Hour),
			}
			im.mu.Unlock()
		} else {
			im.mu.Unlock()
			if record.state == stateProcessing {
				writeErrorJSON(w, http.StatusConflict, "conflict", "Request is already processing")
				return
			}
			if record.state == stateCompleted {
				// Replay the cached response
				w.Header().Set("X-Idempotency-Replayed", "true")
				// We don't restore all original headers for simplicity here, but we could
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.WriteHeader(record.statusCode)
				_, _ = w.Write(record.body)
				return
			}
		}

		// Use a responseRecorder to capture the output of the next handler
		recorder := &responseRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default to 200 OK
		}

		// Safeguard against panics in the next handler
		var completed bool
		defer func() {
			im.mu.Lock()
			if !completed {
				// Clean up the processing record if handler panicked or exited early
				delete(im.records, compositeKey)
			}
			im.mu.Unlock()
		}()

		next.ServeHTTP(recorder, r)
		completed = true // Mark as properly handled

		// Transition state to completed and cache the response
		im.mu.Lock()
		if rec, ok := im.records[compositeKey]; ok {
			rec.state = stateCompleted
			rec.statusCode = recorder.statusCode
			rec.body = recorder.body.Bytes()
			im.records[compositeKey] = rec
		}
		im.mu.Unlock()
	})
}
