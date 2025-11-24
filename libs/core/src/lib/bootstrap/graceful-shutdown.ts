import { INestApplication, Logger } from '@nestjs/common';

export interface GracefulShutdownOptions {
  serviceName?: string;
  timeout?: number;
  logger?: Logger;
  beforeShutdown?: () => Promise<void> | void;
  afterShutdown?: () => Promise<void> | void;
}

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

  app.enableShutdownHooks();

  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    logger.log(`\n${serviceName} received ${signal}, closing...`);

    const shutdownTimer = setTimeout(() => {
      logger.error(`Shutdown timeout (${timeout}ms) exceeded, forcing exit`);
      process.exit(1);
    }, timeout);

    try {
      if (beforeShutdown) {
        logger.log('Running pre-shutdown hooks...');
        await beforeShutdown();
      }

      await app.close();

      if (afterShutdown) {
        logger.log('Running post-shutdown hooks...');
        await afterShutdown();
      }

      clearTimeout(shutdownTimer);
      logger.log(`${serviceName} closed successfully`);
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logger.error(`Error during ${serviceName} shutdown:`, error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });

  logger.log(`Graceful shutdown enabled for ${serviceName}`);
}
