/**
 * File Service Entry Point
 */

import { config } from 'dotenv';

// Load environment variables from file-service .env
config({ path: 'apps/file-service/.env' });

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { enableGracefulShutdown } from '@flexobo/core';
import { SnakeCaseInterceptor } from '@flexobo/shared-kernel';
import { FileModule } from './file.module';

async function bootstrap() {
  const app = await NestFactory.create(FileModule);
  const globalPrefix = 'api';
  const port = process.env['FILE_SERVICE_PORT'] || 3005;

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  // Global interceptors - snake_case response transformation
  app.useGlobalInterceptors(new SnakeCaseInterceptor());

  app.setGlobalPrefix(globalPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('File Service API')
    .setDescription(
      'File storage and management service with AWS S3 integration, event sourcing, and CQRS pattern.'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(`api/docs`, app, documentFactory, {
    jsonDocumentUrl: `/api/docs-json`,
  });

  await app.listen(port);
  Logger.log(
    `File Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(`Health check: http://localhost:${port}/${globalPrefix}/health`);
  Logger.log(`Swagger UI: http://localhost:${port}/${globalPrefix}/docs`);

  // Enable graceful shutdown for HMR and proper cleanup
  enableGracefulShutdown(app, {
    serviceName: 'File Service',
    timeout: 5000,
  });
}

bootstrap();
