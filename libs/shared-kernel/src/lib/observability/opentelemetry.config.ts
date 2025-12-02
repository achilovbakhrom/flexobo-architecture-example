/**
 * OpenTelemetry configuration and initialization
 *
 * Provides distributed tracing, metrics, and logs for microservices observability.
 * Integrates with Jaeger, Prometheus, and other OTLP-compatible backends.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

/**
 * OpenTelemetry configuration options
 */
export interface OpenTelemetryConfig {
  /**
   * Service name for identification in traces
   */
  serviceName: string;

  /**
   * Service version
   */
  serviceVersion?: string;

  /**
   * Deployment environment (development, staging, production)
   */
  environment?: string;

  /**
   * OTLP endpoint for traces (e.g., Jaeger collector)
   */
  traceExporterUrl?: string;

  /**
   * OTLP endpoint for metrics (e.g., Prometheus)
   */
  metricsExporterUrl?: string;

  /**
   * Enable auto-instrumentation
   */
  autoInstrumentation?: boolean;

  /**
   * Additional resource attributes
   */
  resourceAttributes?: Record<string, string>;
}

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeOpenTelemetry(config: OpenTelemetryConfig): NodeSDK {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment = 'development',
    traceExporterUrl = 'http://localhost:4318/v1/traces',
    metricsExporterUrl = 'http://localhost:4318/v1/metrics',
    autoInstrumentation = true,
    resourceAttributes = {},
  } = config;

  // Create resource with service information
  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    ...resourceAttributes,
  });

  // Create trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: traceExporterUrl,
  });

  // Create metrics exporter with periodic reader
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: metricsExporterUrl,
    }),
    exportIntervalMillis: 60000, // Export every 60 seconds
  });

  // Initialize NodeSDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: autoInstrumentation
      ? [
          getNodeAutoInstrumentations({
            // Disable specific instrumentations if needed
            '@opentelemetry/instrumentation-fs': {
              enabled: false, // File system operations can be noisy
            },
          }),
        ]
      : [],
  });

  // Start the SDK
  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) =>
        console.error('Error shutting down OpenTelemetry SDK', error)
      );
  });

  return sdk;
}

/**
 * Default configuration for development
 */
export const defaultOpenTelemetryConfig: Partial<OpenTelemetryConfig> = {
  serviceVersion: '1.0.0',
  environment: 'development',
  traceExporterUrl: 'http://localhost:4318/v1/traces',
  metricsExporterUrl: 'http://localhost:4318/v1/metrics',
  autoInstrumentation: true,
};
