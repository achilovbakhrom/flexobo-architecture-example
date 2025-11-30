/**
 * API Gateway Module
 *
 * SOLID Architecture with:
 * - Dependency Inversion via injection tokens
 * - Open/Closed via strategy pattern for route matching
 * - Single Responsibility via separated services
 * - Interface Segregation via focused interfaces
 */

import { Module, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { HealthModule, ObservabilityModule } from '@flexobo/core';

// Interfaces and tokens
import {
  SERVICE_REGISTRY,
  ROUTE_REGISTRY,
  PROXY_SERVICE,
  HEALTH_CHECKER,
  ROUTE_MATCH_STRATEGIES,
  IServiceRegistry,
  IRouteRegistry,
  ServiceDefinition,
  RouteDefinition,
} from './interfaces';

// Services
import {
  ServiceRegistry,
  RouteRegistry,
  HttpProxyService,
  HealthChecker,
  WebSocketProxyService,
} from './services';

// Strategies
import { createDefaultStrategies } from './strategies';

// Controllers
import { GatewayController } from './gateway.controller';
import { DiscoveryController } from './discovery.controller';

// Config
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

    // Event Emitter for internal events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
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
      environment: process.env.NODE_ENV || 'development',
      traceExporterUrl:
        process.env.OTEL_TRACE_ENDPOINT || 'http://localhost:4318/v1/traces',
      metricsExporterUrl:
        process.env.OTEL_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
      autoInstrumentation: true,
      global: true,
    }),
  ],
  controllers: [GatewayController, DiscoveryController],
  providers: [
    // Route matching strategies (Strategy Pattern)
    {
      provide: ROUTE_MATCH_STRATEGIES,
      useFactory: () => createDefaultStrategies(),
    },

    // Service Registry (Singleton)
    {
      provide: SERVICE_REGISTRY,
      useClass: ServiceRegistry,
    },

    // Route Registry (depends on Service Registry and Strategies)
    {
      provide: ROUTE_REGISTRY,
      useClass: RouteRegistry,
    },

    // HTTP Proxy Service
    {
      provide: PROXY_SERVICE,
      useClass: HttpProxyService,
    },

    // Health Checker
    {
      provide: HEALTH_CHECKER,
      useClass: HealthChecker,
    },

    // WebSocket Proxy Service
    WebSocketProxyService,
  ],
  exports: [
    SERVICE_REGISTRY,
    ROUTE_REGISTRY,
    PROXY_SERVICE,
    HEALTH_CHECKER,
    WebSocketProxyService,
  ],
})
export class GatewayModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatewayModule.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(SERVICE_REGISTRY)
    private readonly serviceRegistry: IServiceRegistry,
    @Inject(ROUTE_REGISTRY)
    private readonly routeRegistry: IRouteRegistry,
    @Inject(HEALTH_CHECKER)
    private readonly healthChecker: HealthChecker
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing API Gateway...');

    // Register services from configuration
    this.registerServicesFromConfig();

    // Register routes for services
    this.registerRoutesFromConfig();

    // Initialize health checker
    this.healthChecker.initialize({
      checkInterval: 30000,
      checkTimeout: 5000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
    });

    // Listen for service registry events
    this.eventEmitter.on('service.registry', (event) => {
      this.logger.debug(`Service registry event: ${event.type}`);
    });

    this.logger.log('API Gateway initialized successfully');
  }

  onModuleDestroy() {
    this.logger.log('Shutting down API Gateway...');
    this.healthChecker.stop();
  }

  /**
   * Register services from configuration
   * This is where you add/remove services - follows Open/Closed principle
   */
  private registerServicesFromConfig(): void {
    const orderServiceUrl = this.configService.get<string>(
      'gateway.orderServiceUrl',
      'http://localhost:3000'
    );
    const adminPanelUrl = this.configService.get<string>(
      'gateway.adminPanelUrl',
      'http://localhost:3002'
    );

    // Define services - easy to add/remove services here
    const services: ServiceDefinition[] = [
      {
        name: 'order-service',
        baseUrl: orderServiceUrl,
        healthCheckPath: '/api/health',
        timeout: 5000,
        wsPath: '/ws',
        retry: {
          attempts: 3,
          delay: 1000,
          backoffMultiplier: 2,
        },
        metadata: {
          description: 'Order management with event sourcing and CQRS',
          version: '1.0.0',
        },
      },
      {
        name: 'admin-panel',
        baseUrl: adminPanelUrl,
        healthCheckPath: '/api/health',
        timeout: 5000,
        retry: {
          attempts: 3,
          delay: 1000,
          backoffMultiplier: 2,
        },
        metadata: {
          description: 'Administrative operations and system monitoring',
          version: '1.0.0',
        },
      },
    ];

    // Register all services
    for (const service of services) {
      this.serviceRegistry.register(service);
    }
  }

  /**
   * Register routes for services
   * Easy to modify routing without changing service definitions
   */
  private registerRoutesFromConfig(): void {
    // Define routes - maps URL patterns to services
    const routes: RouteDefinition[] = [
      // Order Service Routes
      {
        pattern: '/api/v1/orders',
        matchType: 'prefix',
        serviceName: 'order-service',
        metadata: { description: 'Order management endpoints' },
      },
      {
        pattern: '/api/v1/products',
        matchType: 'prefix',
        serviceName: 'order-service',
        metadata: { description: 'Product catalog endpoints' },
      },
      {
        pattern: '/api/v1/payments',
        matchType: 'prefix',
        serviceName: 'order-service',
        metadata: { description: 'Payment processing endpoints' },
      },

      // Admin Panel Routes
      {
        pattern: '/api/v1/admin',
        matchType: 'prefix',
        serviceName: 'admin-panel',
        metadata: { description: 'Admin panel endpoints' },
      },
      {
        pattern: '/api/v1/inventory',
        matchType: 'prefix',
        serviceName: 'admin-panel',
        metadata: { description: 'Inventory management endpoints' },
      },
    ];

    // Register all routes
    this.routeRegistry.registerRoutes(routes);
  }
}


