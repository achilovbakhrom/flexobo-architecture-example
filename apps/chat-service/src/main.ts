import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('ChatService');

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Serve static files for uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Chat Service API')
    .setDescription('Real-time chat microservice with WebSocket support')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // HTTP server
  const port = process.env.PORT || 3006;
  await app.listen(port);
  logger.log(`HTTP server running on http://localhost:${port}`);
  logger.log(`WebSocket server running on ws://localhost:${port}/chat`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
