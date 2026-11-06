package domain

import "context"

type TelemetryType uint8

// Values must match the native SDK's TelemetryEventType enum exactly
// (packages/ghost-ledger/cpp/GhostTelemetryEngine.h), since the wire
// format carries this byte unchanged from client to storage.
const (
	TypeZeroizationTriggered TelemetryType = 1
	TypeIntegrityCompromised TelemetryType = 2
	TypeLatencyMeasurement   TelemetryType = 3

	// Structured Zeroization Reasons (DORA Art. 19 / NIST CSF PR.DS-01)
	TypeZeroizationReasonAckReceived    TelemetryType = 10
	TypeZeroizationReasonTTLExpired     TelemetryType = 11
	TypeZeroizationReasonTamperDetected TelemetryType = 12

	// Hardware Root-of-Trust Status (Blessing et al., 2021)
	TypeHWStrongboxEnforced TelemetryType = 20
	TypeHWFallbackBlocked   TelemetryType = 21

	// Backend Ingestion & Idempotency Collisions (Wang et al., 2023)
	TypeIdempotencyCollisionResolved TelemetryType = 30
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
