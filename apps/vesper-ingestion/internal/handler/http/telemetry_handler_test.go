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

	"sovereign-core/telemetry-api/internal/domain"
	myhttp "sovereign-core/telemetry-api/internal/handler/http"
	"sovereign-core/telemetry-api/internal/middleware"
)

type MockForwarder struct {
	events []domain.TelemetryEvent
}

func (m *MockForwarder) ForwardEvent(ctx context.Context, e domain.TelemetryEvent) error {
	m.events = append(m.events, e)
	return nil
}

func TestTelemetryIngest(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	forwarder := &MockForwarder{}
	repo := NewMockAuthRepo() // From auth_handler_test.go

	handler := myhttp.NewTelemetryHandler(logger, forwarder, repo)

	// Create binary payload
	buf := new(bytes.Buffer)
	buf.WriteByte(1) // Type
	
	timestamp := make([]byte, 8)
	binary.LittleEndian.PutUint64(timestamp, 1690000000)
	buf.Write(timestamp)
	
	value := make([]byte, 8)
	binary.LittleEndian.PutUint64(value, math.Float64bits(42.5))
	buf.Write(value)

	req, _ := http.NewRequest("POST", "/ingest", buf)
	
	// Inject TenantID into Context (Simulating ApiKeyValidator)
	ctx := context.WithValue(req.Context(), middleware.TenantIDKey, "tenant_123")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.Ingest(rr, req)

	if rr.Code != http.StatusAccepted {
		t.Errorf("Expected status 202, got %v", rr.Code)
	}

	if len(forwarder.events) != 1 {
		t.Fatalf("Expected 1 event forwarded, got %d", len(forwarder.events))
	}

	if forwarder.events[0].Value != 42.5 {
		t.Errorf("Expected value 42.5, got %v", forwarder.events[0].Value)
	}
}
