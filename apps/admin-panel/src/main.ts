/**
 * Admin Panel Service - Main Entry Point
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { enableGracefulShutdown } from '@flexobo/core';
import { AdminPanelModule } from './admin-panel.module';

async function bootstrap() {
  const app = await NestFactory.create(AdminPanelModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3000',
    ],
    credentials: true,
  });

  const port = process.env.ADMIN_PANEL_PORT || 3002;

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Admin Panel API')
    .setDescription('System administration and monitoring.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token (ADMIN role required)',
      },
      'JWT'
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory, {
    jsonDocumentUrl: '/api/docs-json',
  });

  await app.listen(port);

  Logger.log(`🚀 Admin Panel Service is running on: http://localhost:${port}`);
  Logger.log(`🔐 All endpoints require ADMIN role`);
  Logger.log(`📖 Swagger UI: http://localhost:${port}/api/docs`);

  // Enable graceful shutdown for HMR and proper cleanup
  enableGracefulShutdown(app, {
    serviceName: 'Admin Panel',
    timeout: 5000,
  });
}

bootstrap();
