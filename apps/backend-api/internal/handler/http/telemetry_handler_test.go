package http_test

import (
	"bytes"
	"context"
	"encoding/binary"
	"log/slog"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"sovereign-core/backend-api/internal/domain"
	myhttp "sovereign-core/backend-api/internal/handler/http"
)

type MockTelemetryForwarder struct {
	events []domain.TelemetryEvent
}

func (m *MockTelemetryForwarder) ForwardMetrics(ctx context.Context, events []domain.TelemetryEvent) error {
	m.events = append(m.events, events...)
	return nil
}

func TestTelemetryHandler_Ingest(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	mockForwarder := &MockTelemetryForwarder{}
	handler := myhttp.NewTelemetryHandler(logger, mockForwarder)

	var buf bytes.Buffer
	// Event 1
	binary.Write(&buf, binary.LittleEndian, uint8(1))
	binary.Write(&buf, binary.LittleEndian, uint64(1000))
	binary.Write(&buf, binary.LittleEndian, math.Float64bits(1.0))
	
	// Event 2
	binary.Write(&buf, binary.LittleEndian, uint8(3))
	binary.Write(&buf, binary.LittleEndian, uint64(2000))
	binary.Write(&buf, binary.LittleEndian, math.Float64bits(12.5))

	req := httptest.NewRequest(http.MethodPost, "/telemetry/ingest", &buf)
	w := httptest.NewRecorder()

	handler.Ingest(w, req)

	res := w.Result()
	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %v", res.Status)
	}

	if len(mockForwarder.events) != 2 {
		t.Fatalf("Expected 2 events, got %d", len(mockForwarder.events))
	}

	ev1 := mockForwarder.events[0]
	if ev1.Type != domain.ZeroizationTriggered || ev1.Timestamp != 1000 || ev1.Value != 1.0 {
		t.Errorf("Event 1 mismatch: %+v", ev1)
	}

	ev2 := mockForwarder.events[1]
	if ev2.Type != domain.ComputeHashLatency || ev2.Timestamp != 2000 || ev2.Value != 12.5 {
		t.Errorf("Event 2 mismatch: %+v", ev2)
	}
}
