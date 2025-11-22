/**
 * Database health indicator
 */

import { BaseHealthIndicator } from '../health-indicator.base';
import {
  HealthIndicatorResult,
  DatabaseHealthOptions,
  HealthCheckConfig,
} from '../health.types';

/**
 * Generic database health indicator
 */
export class DatabaseHealthIndicator extends BaseHealthIndicator {
  constructor(
    name: string,
    private readonly checkConnection: () => Promise<boolean>,
    private readonly options: DatabaseHealthOptions = {},
    config?: HealthCheckConfig
  ) {
    super(name, config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      const isConnected = await this.checkConnection();

      if (!isConnected) {
        return this.down('Database connection failed');
      }

      const duration = Date.now() - start;

      return this.up('Database is healthy', {
        connectionTime: `${duration}ms`,
      });
    } catch (error) {
      return this.down(
        `Database check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * PostgreSQL health indicator
 */
export class PostgreSQLHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly executeQuery: (query: string) => Promise<unknown>,
    private readonly options: DatabaseHealthOptions = {},
    config?: HealthCheckConfig
  ) {
    super('postgresql', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    const query = this.options.query || 'SELECT 1';

    try {
      await this.executeQuery(query);

      return this.up('PostgreSQL is healthy', {
        query,
      });
    } catch (error) {
      return this.down(
        `PostgreSQL check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * MongoDB health indicator
 */
export class MongoDBHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly ping: () => Promise<boolean>,
    config?: HealthCheckConfig
  ) {
    super('mongodb', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    try {
      const isConnected = await this.ping();

      if (!isConnected) {
        return this.down('MongoDB connection failed');
      }

      return this.up('MongoDB is healthy');
    } catch (error) {
      return this.down(
        `MongoDB check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
