package telemetry

import (
	"context"

	"vesper-core/vesper-ingestion/internal/domain"
)

// NoopForwarder implements domain.TelemetryForwarder as a silent no-op.
// It is used when the OpenTelemetry collector is unavailable so that the
// ingest endpoint stays mounted and events are still persisted locally in
// SQLite — the only data source the Support Portal dashboard reads from.
type NoopForwarder struct{}

func (n *NoopForwarder) ForwardEvent(_ context.Context, _ domain.TelemetryEvent) error {
	return nil
}
