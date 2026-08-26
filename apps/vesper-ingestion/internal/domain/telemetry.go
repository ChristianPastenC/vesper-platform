package domain

import "context"

type TelemetryType uint8

// Values must match the native SDK's TelemetryEventType enum exactly
// (packages/secure-client/cpp/SovereignTelemetryEngine.h), since the wire
// format carries this byte unchanged from client to storage.
const (
	TypeZeroizationTriggered TelemetryType = 1
	TypeIntegrityCompromised TelemetryType = 2
	TypeLatencyMeasurement   TelemetryType = 3
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
