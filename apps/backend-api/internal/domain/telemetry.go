package domain

import "context"

type TelemetryEventType uint8

const (
	ZeroizationTriggered TelemetryEventType = 1
	IntegrityCompromised TelemetryEventType = 2
	ComputeHashLatency   TelemetryEventType = 3
)

type TelemetryEvent struct {
	Type      TelemetryEventType
	Timestamp uint64 // UNIX ms
	Value     float64
}

type TelemetryForwarder interface {
	ForwardMetrics(ctx context.Context, events []TelemetryEvent) error
}
