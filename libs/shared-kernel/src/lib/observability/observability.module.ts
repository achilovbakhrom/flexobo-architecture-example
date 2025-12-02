/**
 * NestJS module for OpenTelemetry observability
 */

import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import {
  OpenTelemetryConfig,
  initializeOpenTelemetry,
} from './opentelemetry.config';
import { ObservabilityLogger } from './logger';
import { MetricsManager, BusinessMetrics } from './metrics';
import { Tracer } from './tracer';

/**
 * OpenTelemetry module options
 */
export interface OpenTelemetryModuleOptions extends OpenTelemetryConfig {
  global?: boolean;
}

@Global()
@Module({})
export class ObservabilityModule {
  static forRoot(options: OpenTelemetryModuleOptions): DynamicModule {
    // Initialize OpenTelemetry SDK
    const sdk = initializeOpenTelemetry(options);

    // Create providers
    const providers = [
      {
        provide: 'OTEL_SDK',
        useValue: sdk,
      } as const,
      {
        provide: ObservabilityLogger,
        useValue: new ObservabilityLogger('Application'),
      } as const,
      {
        provide: MetricsManager,
        useValue: new MetricsManager(),
      } as const,
      {
        provide: BusinessMetrics,
        useFactory: (metricsManager: MetricsManager) => {
          return new BusinessMetrics(metricsManager);
        },
        inject: [MetricsManager],
      },
      {
        provide: Tracer,
        useValue: new Tracer(),
      } as const,
    ];

    return {
      module: ObservabilityModule,
      global: options.global !== false,
      providers: providers as Provider[],
      exports: providers as Provider[],
    };
  }
}
