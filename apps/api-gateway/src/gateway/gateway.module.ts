/**
 * API Gateway Module
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule, ObservabilityModule } from '@flexobo/shared-kernel';
import { ProxyService } from './proxy.service';
import { RoutingService } from './routing.service';
import { GatewayController } from './gateway.controller';
import { DiscoveryController } from './discovery.controller';
import { GatewayConfig } from './gateway.types';
import gatewayConfig from '../config/configuration';
import { validate } from '../config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [gatewayConfig],
      validate,
      cache: true,
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
    // Note: Using process.env here is acceptable because:
    // 1. Module initialization happens before ConfigService is available
    // 2. Values are validated via env.validation.ts
    // 3. Centralized in configuration.ts for documentation
    ObservabilityModule.forRoot({
      serviceName: 'api-gateway',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      traceExporterUrl:
        process.env.OTEL_TRACE_ENDPOINT ||
        'http://localhost:4318/v1/traces',
      metricsExporterUrl:
        process.env.OTEL_METRICS_ENDPOINT ||
        'http://localhost:4318/v1/metrics',
      autoInstrumentation: true,
      global: true,
    }),
  ],
  controllers: [GatewayController, DiscoveryController],
  providers: [ProxyService, RoutingService],
})
export class GatewayModule implements OnModuleInit {
  constructor(
    private readonly routingService: RoutingService,
    private readonly configService: ConfigService
  ) {}

  onModuleInit() {
    const orderServiceUrl = this.configService.get<string>(
      'gateway.orderServiceUrl',
      'http://localhost:3000'
    );
    const adminPanelUrl = this.configService.get<string>(
      'gateway.adminPanelUrl',
      'http://localhost:3002'
    );

    // Load gateway configuration
    const config: GatewayConfig = {
      port: this.configService.get<number>('gateway.port', 3001),
      services: [
        // Order Service - handles all /api/v1/orders/* routes
        {
          name: 'order-service',
          baseUrl: orderServiceUrl,
          prefix: '/api/v1/orders',
          healthCheckPath: '/api/health',
          enabled: true,
          timeout: 5000,
          retry: {
            attempts: 3,
            delay: 1000,
          },
        },
        // Admin Panel - handles all /api/v1/admin/* routes
        {
          name: 'admin-panel',
          baseUrl: adminPanelUrl,
          prefix: '/api/v1/admin',
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
