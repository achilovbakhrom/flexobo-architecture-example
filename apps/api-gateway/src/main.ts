/**
 * API Gateway Entry Point
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway/gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  const port = process.env.API_GATEWAY_PORT || 3001;

  // Enable CORS
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  await app.listen(port);

  Logger.log(`🚪 API Gateway is running on: http://localhost:${port}`);
  Logger.log(`📊 Health check: http://localhost:${port}/api/health`);
  Logger.log(`🔗 Routes: http://localhost:${port}/api/gateway/routes`);
}

bootstrap();
