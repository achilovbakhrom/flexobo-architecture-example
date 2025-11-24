/**
 * Graceful Shutdown Utility
 * Provides graceful shutdown handling for all NestJS applications
 */

import { INestApplication, Logger } from '@nestjs/common';

export interface GracefulShutdownOptions {
  /**
   * Service name for logging
   */
  serviceName?: string;

  /**
   * Timeout in milliseconds before forcing shutdown
   * @default 5000
   */
  timeout?: number;

  /**
   * Custom logger instance
   */
  logger?: Logger;

  /**
   * Callback to run before shutdown
   */
  beforeShutdown?: () => Promise<void> | void;

  /**
   * Callback to run after successful shutdown
   */
  afterShutdown?: () => Promise<void> | void;
}

/**
 * Enable graceful shutdown for NestJS application
 * Handles SIGTERM, SIGINT, and uncaught errors
 *
 * @example
 * ```typescript
 * import { enableGracefulShutdown } from '@flexobo/core';
 *
 * const app = await NestFactory.create(AppModule);
 * await app.listen(3000);
 *
 * enableGracefulShutdown(app, {
 *   serviceName: 'api-gateway',
 *   timeout: 5000,
 * });
 * ```
 */
export function enableGracefulShutdown(
  app: INestApplication,
  options: GracefulShutdownOptions = {}
): void {
  const {
    serviceName = 'Application',
    timeout = 5000,
    logger = new Logger('GracefulShutdown'),
    beforeShutdown,
    afterShutdown,
  } = options;

  // Enable NestJS shutdown hooks
  app.enableShutdownHooks();

  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    logger.log(`\n🛑 ${serviceName} received ${signal}, closing...`);

    // Set shutdown timeout
    const shutdownTimer = setTimeout(() => {
      logger.error(
        `❌ Shutdown timeout (${timeout}ms) exceeded, forcing exit`
      );
      process.exit(1);
    }, timeout);

    try {
      // Run before shutdown hook
      if (beforeShutdown) {
        logger.log('Running pre-shutdown hooks...');
        await beforeShutdown();
      }

      // Close NestJS application (closes HTTP server, connections, etc.)
      await app.close();

      // Run after shutdown hook
      if (afterShutdown) {
        logger.log('Running post-shutdown hooks...');
        await afterShutdown();
      }

      clearTimeout(shutdownTimer);
      logger.log(`✅ ${serviceName} closed successfully`);
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logger.error(`❌ Error during ${serviceName} shutdown:`, error);
      process.exit(1);
    }
  };

  // Handle termination signals (important for HMR)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });

  logger.log(`✅ Graceful shutdown enabled for ${serviceName}`);
}
