package http

import (
	"bytes"
	"encoding/binary"
	"io"
	"log/slog"
	"math"
	"net/http"

	"sovereign-core/backend-api/internal/domain"
)

type TelemetryHandler struct {
	logger    *slog.Logger
	forwarder domain.TelemetryForwarder
}

func NewTelemetryHandler(logger *slog.Logger, forwarder domain.TelemetryForwarder) *TelemetryHandler {
	return &TelemetryHandler{
		logger:    logger,
		forwarder: forwarder,
	}
}

func (h *TelemetryHandler) Ingest(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("Failed to read telemetry payload", "error", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if len(body)%17 != 0 {
		h.logger.Warn("Invalid telemetry payload size", "size", len(body))
		http.Error(w, "Invalid payload size", http.StatusBadRequest)
		return
	}

	numEvents := len(body) / 17
	events := make([]domain.TelemetryEvent, 0, numEvents)
	reader := bytes.NewReader(body)

	for i := 0; i < numEvents; i++ {
		var eventType uint8
		var timestamp uint64
		var floatBytes uint64

		if err := binary.Read(reader, binary.LittleEndian, &eventType); err != nil {
			h.logger.Error("Failed to read event type", "error", err)
			http.Error(w, "Invalid payload", http.StatusBadRequest)
			return
		}
		if err := binary.Read(reader, binary.LittleEndian, &timestamp); err != nil {
			h.logger.Error("Failed to read timestamp", "error", err)
			http.Error(w, "Invalid payload", http.StatusBadRequest)
			return
		}
		
		if err := binary.Read(reader, binary.LittleEndian, &floatBytes); err != nil {
			h.logger.Error("Failed to read value", "error", err)
			http.Error(w, "Invalid payload", http.StatusBadRequest)
			return
		}
		value := math.Float64frombits(floatBytes)

		events = append(events, domain.TelemetryEvent{
			Type:      domain.TelemetryEventType(eventType),
			Timestamp: timestamp,
			Value:     value,
		})
	}

	if err := h.forwarder.ForwardMetrics(r.Context(), events); err != nil {
		h.logger.Error("Failed to forward metrics", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
