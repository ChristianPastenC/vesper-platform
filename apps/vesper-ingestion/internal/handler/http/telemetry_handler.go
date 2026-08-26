package http

import (
	"encoding/binary"
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

// @Summary Ingest Telemetry
// @Description Ingest binary telemetry dumps from the mobile SDK
// @Tags Telemetry
// @Accept octet-stream
// @Produce plain
// @Param X-Sovereign-API-Key header string true "API Key"
// @Param X-Bundle-ID header string true "Bundle ID of the mobile app"
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

	for i := 0; i < len(body); i += structSize {
		chunk := body[i : i+structSize]
		
		eventType := domain.TelemetryType(chunk[0])
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
