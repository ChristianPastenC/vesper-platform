package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.17.0"

	"sovereign-core/backend-api/internal/domain"
)

type OtelClient struct {
	logger             *slog.Logger
	meterProvider      *sdkmetric.MeterProvider
	meter              metric.Meter
	zeroizationCounter metric.Int64Counter
	integrityCounter   metric.Int64Counter
	latencyHistogram   metric.Float64Histogram
}

func NewOtelClient(logger *slog.Logger) (*OtelClient, error) {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		endpoint = "localhost:4317"
	}

	exporter, err := otlpmetricgrpc.New(context.Background(),
		otlpmetricgrpc.WithEndpoint(endpoint),
		otlpmetricgrpc.WithInsecure(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP metric exporter: %w", err)
	}

	res := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceName("sovereign-secure-client"),
	)

	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter)),
		sdkmetric.WithResource(res),
	)

	meter := meterProvider.Meter("sovereign-telemetry")

	zeroizationCounter, _ := meter.Int64Counter("telemetry.zeroization.count", metric.WithDescription("Number of zeroization events triggered"))
	integrityCounter, _ := meter.Int64Counter("telemetry.integrity.compromised", metric.WithDescription("Number of integrity compromised events"))
	latencyHistogram, _ := meter.Float64Histogram("telemetry.hash.latency", metric.WithDescription("Latency of cryptographic hash computation in ms"))

	return &OtelClient{
		logger:             logger,
		meterProvider:      meterProvider,
		meter:              meter,
		zeroizationCounter: zeroizationCounter,
		integrityCounter:   integrityCounter,
		latencyHistogram:   latencyHistogram,
	}, nil
}

func (o *OtelClient) ForwardMetrics(ctx context.Context, events []domain.TelemetryEvent) error {
	for _, ev := range events {
		switch ev.Type {
		case domain.ZeroizationTriggered:
			o.zeroizationCounter.Add(ctx, 1)
		case domain.IntegrityCompromised:
			o.integrityCounter.Add(ctx, 1)
		case domain.ComputeHashLatency:
			o.latencyHistogram.Record(ctx, ev.Value)
		default:
			o.logger.Warn("Unknown telemetry event type", "type", ev.Type)
		}
	}
	return nil
}

func (o *OtelClient) Shutdown(ctx context.Context) error {
	return o.meterProvider.Shutdown(ctx)
}
