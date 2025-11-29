/**
 * API Gateway Configuration
 * Typed configuration with validation
 */

import { registerAs } from '@nestjs/config';

export interface GatewayConfig {
  port: number;
  corsOrigin: string;
  nodeEnv: string;
  orderServiceUrl: string;
  adminPanelUrl: string;
  gatewayUrl: string;
  observability: {
    serviceName: string;
    serviceVersion: string;
    traceExporterUrl: string;
    metricsExporterUrl: string;
    autoInstrumentation: boolean;
  };
}

export default registerAs(
  'gateway',
  (): GatewayConfig => ({
    port: parseInt(process.env.API_GATEWAY_PORT || '3001', 10),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    nodeEnv: process.env.NODE_ENV || 'development',
    orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3000',
    adminPanelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:3002',
    gatewayUrl:
      process.env.GATEWAY_SERVICE_URL ||
      `http://localhost:${process.env.API_GATEWAY_PORT || '3001'}`,
    observability: {
      serviceName: 'api-gateway',
      serviceVersion: '1.0.0',
      traceExporterUrl:
        process.env.OTEL_TRACE_ENDPOINT ||
        'http://localhost:4318/v1/traces',
      metricsExporterUrl:
        process.env.OTEL_METRICS_ENDPOINT ||
        'http://localhost:4318/v1/metrics',
      autoInstrumentation: true,
    },
  })
);
