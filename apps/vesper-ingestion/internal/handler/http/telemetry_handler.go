package http

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"io"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"

	"vesper-core/vesper-ingestion/internal/domain"
	"vesper-core/vesper-ingestion/internal/middleware"
)

type TelemetryHandler struct {
	logger    *slog.Logger
	forwarder domain.TelemetryForwarder
	repo      domain.AuthRepository
}

func NewTelemetryHandler(logger *slog.Logger, forwarder domain.TelemetryForwarder, repo domain.AuthRepository) *TelemetryHandler {
	return &TelemetryHandler{
		logger:    logger,
		forwarder: forwarder,
		repo:      repo,
	}
}

// generateKeystream reproduces the same SHA-256 keystream that
// MmapTelemetryStorage::generateKeystream() generates on the C++ side:
//
//	SHA-256( sessionKey || iv || uint64_le(index) )
//
// This is the inverse operation needed when the SDK sends the raw XOR-encrypted
// bytes directly (e.g. from a zero-copy mmap region) instead of going through
// readAllAndClear() which already decrypts in place.
func generateKeystream(sessionKey, iv []byte, index uint64) []byte {
	preImage := make([]byte, 0, len(sessionKey)+len(iv)+8)
	preImage = append(preImage, sessionKey...)
	preImage = append(preImage, iv...)
	idxBuf := make([]byte, 8)
	binary.LittleEndian.PutUint64(idxBuf, index)
	preImage = append(preImage, idxBuf...)
	h := sha256.Sum256(preImage)
	return h[:]
}

// applyXOR XORs each byte of buf with the rolling keystream.
// Generates one 32-byte block per struct (index advances by one per 17-byte event).
func applyXOR(buf []byte, sessionKey, iv []byte, startIndex uint64) {
	const structSize = 17
	numEvents := len(buf) / structSize
	for i := 0; i < numEvents; i++ {
		ks := generateKeystream(sessionKey, iv, startIndex+uint64(i))
		chunk := buf[i*structSize : (i+1)*structSize]
		for j := 0; j < structSize; j++ {
			chunk[j] ^= ks[j%len(ks)]
		}
	}
}

// @Summary Ingest Telemetry
// @Description Ingest binary telemetry dumps from the mobile SDK
// @Tags Telemetry
// @Accept octet-stream
// @Produce plain
// @Param X-Sovereign-API-Key header string true "API Key"
// @Param X-Bundle-ID header string true "Bundle ID of the mobile app"
// @Param X-Sovereign-Session-Key header string false "Hex-encoded 32-byte session key (required when sending raw XOR-encrypted mmap bytes)"
// @Param X-Sovereign-IV header string false "Hex-encoded 32-byte IV from the mmap header (required together with X-Sovereign-Session-Key)"
// @Param payload body []byte true "Binary telemetry payload"
// @Success 202 {string} string "Accepted"
// @Failure 400 {string} string "Invalid payload format"
// @Failure 401 {string} string "Tenant identity missing"
// @Router /api/v1/support/telemetry/ [post]
func (h *TelemetryHandler) Ingest(w http.ResponseWriter, r *http.Request) {
	// Extract TenantID securely injected by the ApiKeyValidator
	tenantID, ok := r.Context().Value(middleware.TenantIDKey).(string)
	if !ok || tenantID == "" {
		http.Error(w, "Tenant identity missing", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("Failed to read telemetry body", "error", err)
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	const structSize = 17 // 1 byte type + 8 bytes timestamp + 8 bytes float64 value
	if len(body) == 0 || len(body)%structSize != 0 {
		h.logger.Warn("Invalid telemetry payload size", "size", len(body), "tenant", tenantID)
		http.Error(w, "Invalid payload format", http.StatusBadRequest)
		return
	}

	// -- XOR decryption (optional, backward-compatible) ------------------------
	// The C++ SDK's readAllAndClear() already XOR-decrypts in place before
	// serialising to the ArrayBuffer that JS sends here. However, if a caller
	// sends the raw XOR-encrypted bytes (e.g. from a zero-copy mmap path or a
	// future SDK optimisation), it MUST supply both session-key and IV headers
	// so we can apply the exact same keystream and recover the plaintext.
	//
	// Header protocol (both must be present to trigger decryption):
	//   X-Sovereign-Session-Key: <64 hex chars = 32 bytes>
	//   X-Sovereign-IV:          <64 hex chars = 32 bytes>
	//
	// The key and IV are short-lived, per-session values — they are NOT the
	// tenant master secret. The backend never stores them.
	sessionKeyHex := r.Header.Get("X-Sovereign-Session-Key")
	ivHex := r.Header.Get("X-Sovereign-IV")

	if sessionKeyHex != "" && ivHex != "" {
		sessionKey, errK := hex.DecodeString(sessionKeyHex)
		iv, errIV := hex.DecodeString(ivHex)
		if errK != nil || errIV != nil || len(sessionKey) != 32 || len(iv) != 32 {
			h.logger.Warn("Invalid XOR session headers", "tenant", tenantID)
			http.Error(w, "Invalid X-Sovereign-Session-Key or X-Sovereign-IV header", http.StatusBadRequest)
			return
		}
		// Apply in-place XOR. startIndex=0 mirrors the sequential index used
		// by MmapTelemetryStorage when the ring buffer starts from the oldest entry.
		applyXOR(body, sessionKey, iv, 0)
	}

	// -- Parse and validate each 17-byte struct --------------------------------
	for i := 0; i < len(body); i += structSize {
		chunk := body[i : i+structSize]
		
		eventType := domain.TelemetryType(chunk[0])

		// Guard: if the type byte is not a known value the payload is likely
		// still XOR-encrypted (mis-configured client) — reject early so we
		// never persist garbage metrics.
		if eventType != domain.TypeZeroizationTriggered &&
			eventType != domain.TypeIntegrityCompromised &&
			eventType != domain.TypeLatencyMeasurement {
			h.logger.Warn("Unknown telemetry event type — possible XOR mismatch",
				"byte", chunk[0], "offset", i, "tenant", tenantID)
			http.Error(w, "Invalid payload: unknown event type — check XOR session headers", http.StatusBadRequest)
			return
		}

		timestamp := int64(binary.LittleEndian.Uint64(chunk[1:9]))
		valueBits := binary.LittleEndian.Uint64(chunk[9:17])
		value := math.Float64frombits(valueBits)

		event := domain.TelemetryEvent{
			Type:      eventType,
			Timestamp: timestamp,
			Value:     value,
			TenantID:  tenantID,
		}

		if err := h.forwarder.ForwardEvent(r.Context(), event); err != nil {
			h.logger.Error("Failed to forward telemetry event", "error", err, "tenant", tenantID)
		}

		// Also persist locally in SQLite for the Support Portal Dashboard
		dbMetric := domain.Metric{
			ID:         uuid.NewString(),
			TenantID:   tenantID,
			MetricType: int(eventType),
			Value:      value,
			Timestamp:  time.UnixMilli(timestamp),
		}
		if err := h.repo.InsertMetric(r.Context(), dbMetric); err != nil {
			h.logger.Error("Failed to save metric locally", "error", err)
		}
	}

	w.WriteHeader(http.StatusAccepted)
}

