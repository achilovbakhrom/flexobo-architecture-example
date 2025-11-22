/**
 * Admin Panel Service - Main Entry Point
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const port = process.env.ADMIN_PANEL_PORT || 3002;

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Admin Panel API')
    .setDescription('System administration and monitoring')
    .setVersion('1.0')
    .addTag('admin')
    .addBearerAuth()
    .addServer(`http://localhost:${port}`, 'Admin Panel')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Expose JSON spec for aggregation
  app.use(
    'api/docs-json',
    (_req: never, res: { json: (data: unknown) => void }) => {
      res.json(document);
    }
  );

  await app.listen(port);

  Logger.log(`🚀 Admin Panel Service is running on: http://localhost:${port}`);
  Logger.log(`🔐 All endpoints require ADMIN role`);
  Logger.log(`📖 Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
