/**
 * Health check module
 */

import { Module, DynamicModule, Global } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { HealthIndicator } from './health.types';

/**
 * Health module options
 */
export interface HealthModuleOptions {
  /**
   * Health indicators to register
   */
  indicators?: HealthIndicator[];

  /**
   * Dependency indicators (external services)
   */
  dependencies?: HealthIndicator[];

  /**
   * Application version
   */
  version?: string;

  /**
   * Enable health check endpoints
   */
  enableEndpoints?: boolean;

  /**
   * Make module global
   */
  global?: boolean;
}

@Global()
@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions = {}): DynamicModule {
    const healthService = new HealthService();

    // Register indicators
    if (options.indicators) {
      options.indicators.forEach((indicator) => {
        healthService.registerIndicator(indicator, false);
      });
    }

    // Register dependencies
    if (options.dependencies) {
      options.dependencies.forEach((indicator) => {
        healthService.registerIndicator(indicator, true);
      });
    }

    // Set version
    if (options.version) {
      healthService.setVersion(options.version);
    }

    const providers = [
      {
        provide: HealthService,
        useValue: healthService,
      },
    ];

    const controllers =
      options.enableEndpoints !== false ? [HealthController] : [];

    return {
      module: HealthModule,
      global: options.global !== false,
      providers,
      controllers,
      exports: providers,
    };
  }
}
