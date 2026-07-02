package domain

import "context"

type TelemetryType uint8

const (
	TypeIntegrityCompromised TelemetryType = 1
	TypeLatencyMeasurement   TelemetryType = 2
	TypeZeroizationTriggered TelemetryType = 3
)

type TelemetryEvent struct {
	Type      TelemetryType
	Timestamp int64
	Value     float64
	TenantID  string
}

type TelemetryForwarder interface {
	ForwardEvent(ctx context.Context, event TelemetryEvent) error
}
