/**
 * API Gateway Module
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from '@flexobo/core';
import { ObservabilityModule } from '@flexobo/core';
import { ProxyService } from './proxy.service';
import { RoutingService } from './routing.service';
import { GatewayController } from './gateway.controller';
import { GatewayConfig } from './gateway.types';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Health Checks
    HealthModule.forRoot({
      version: '1.0.0',
      enableEndpoints: true,
      indicators: [],
      dependencies: [],
      global: true,
    }),

    // OpenTelemetry
    ObservabilityModule.forRoot({
      serviceName: 'api-gateway',
      serviceVersion: '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      traceExporterUrl:
        process.env['OTEL_TRACE_ENDPOINT'] || 'http://localhost:4318/v1/traces',
      metricsExporterUrl:
        process.env['OTEL_METRICS_ENDPOINT'] ||
        'http://localhost:4318/v1/metrics',
      autoInstrumentation: true,
      global: true,
    }),
  ],
  controllers: [GatewayController],
  providers: [ProxyService, RoutingService],
})
export class GatewayModule implements OnModuleInit {
  constructor(
    private readonly routingService: RoutingService,
    private readonly configService: ConfigService
  ) {}

  onModuleInit() {
    // Load gateway configuration
    const config: GatewayConfig = {
      port: parseInt(this.configService.get('PORT') || '3000'),
      services: [
        {
          name: 'order-service',
          baseUrl:
            this.configService.get('ORDER_SERVICE_URL') ||
            'http://localhost:3001',
          prefix: '/api/v1/orders',
          healthCheckPath: '/api/health',
          enabled: true,
          timeout: 5000,
          retry: {
            attempts: 3,
            delay: 1000,
          },
        },
      ],
    };

    // Register routes
    this.routingService.registerRoutes(config.services);
  }
}
