package telemetry

import (
	"context"
	"fmt"
	"log/slog"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"

	"sovereign-core/telemetry-api/internal/domain"
)

type OtelClient struct {
	logger             *slog.Logger
	meterProvider      *sdkmetric.MeterProvider
	meter              metric.Meter
	integrityCounter   metric.Int64Counter
	latencyHistogram   metric.Float64Histogram
	zeroizationCounter metric.Int64Counter
}

func NewOtelClient(logger *slog.Logger) (*OtelClient, error) {
	ctx := context.Background()

	exporter, err := otlpmetricgrpc.New(ctx,
		otlpmetricgrpc.WithInsecure(),
		otlpmetricgrpc.WithEndpoint("localhost:4317"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP exporter: %w", err)
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceNameKey.String("sovereign-telemetry-api"),
		),
	)
	if err != nil {
		return nil, err
	}

	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter)),
		sdkmetric.WithResource(res),
	)
	otel.SetMeterProvider(meterProvider)

	meter := meterProvider.Meter("sovereign.secure.client")

	integrityCounter, _ := meter.Int64Counter(
		"telemetry_integrity_compromised_total",
		metric.WithDescription("Number of integrity compromised events"),
	)
	latencyHistogram, _ := meter.Float64Histogram(
		"telemetry_latency_ms",
		metric.WithDescription("Latency of operations in milliseconds"),
	)
	zeroizationCounter, _ := meter.Int64Counter(
		"telemetry_zeroization_triggered_total",
		metric.WithDescription("Number of zeroization events triggered"),
	)

	return &OtelClient{
		logger:             logger,
		meterProvider:      meterProvider,
		meter:              meter,
		integrityCounter:   integrityCounter,
		latencyHistogram:   latencyHistogram,
		zeroizationCounter: zeroizationCounter,
	}, nil
}

func (c *OtelClient) Shutdown(ctx context.Context) error {
	return c.meterProvider.Shutdown(ctx)
}

func (c *OtelClient) ForwardEvent(ctx context.Context, event domain.TelemetryEvent) error {
	opts := metric.WithAttributes(attribute.String("tenant_id", event.TenantID))

	switch event.Type {
	case domain.TypeIntegrityCompromised:
		c.integrityCounter.Add(ctx, 1, opts)
	case domain.TypeLatencyMeasurement:
		c.latencyHistogram.Record(ctx, event.Value, opts)
	case domain.TypeZeroizationTriggered:
		c.zeroizationCounter.Add(ctx, 1, opts)
	default:
		c.logger.Warn("Unknown telemetry type", "type", event.Type)
	}

	return nil
}
