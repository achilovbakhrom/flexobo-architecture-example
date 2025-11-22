/**
 * API Gateway Entry Point
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { GatewayModule } from './gateway/gateway.module';
import { SwaggerAggregatorService } from './gateway/swagger-aggregator.service';

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

  // Setup Swagger UI pointing to dynamic aggregated spec
  SwaggerModule.setup(
    'api/docs',
    app,
    {
      openapi: '3.0.0',
      info: {
        title: 'Microservices API',
        description: 'Unified API documentation for all microservices',
        version: '1.0.0',
      },
      paths: {},
    } as never,
    {
      jsonDocumentUrl: '/api/docs-json',
      swaggerOptions: {
        persistAuthorization: true,
        url: '/api/docs-json',
      },
    }
  );

  await app.listen(port);

  Logger.log(`🚪 API Gateway is running on: http://localhost:${port}`);
  Logger.log(`📊 Health check: http://localhost:${port}/api/health`);
  Logger.log(`🔗 Routes: http://localhost:${port}/api/gateway/routes`);
  Logger.log(`📖 Unified Swagger UI: http://localhost:${port}/api/docs`);
  Logger.log(`   (Dynamically aggregates specs from all running services)`);
}

bootstrap();
