/**
 * Admin Panel Service - Main Entry Point
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);

  Logger.log(`🚀 Admin Panel Service is running on: http://localhost:${port}`);
  Logger.log(`🔐 All endpoints require ADMIN role`);
}

bootstrap();
