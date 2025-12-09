import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SnakeCaseInterceptor } from '@flexobo/shared-kernel';

import { TelegramModule } from './telegram.module';

async function bootstrap() {
  const app = await NestFactory.create(TelegramModule);
  const logger = new Logger('TelegramService');

  const isDev = process.env['MODE'] !== 'prod';

  // Enable CORS
  app.enableCors(
    isDev
      ? {
          origin: '*',
          methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
          preflightContinue: false,
          optionsSuccessStatus: 204,
        }
      : undefined
  );

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Global interceptors - snake_case response transformation
  app.useGlobalInterceptors(new SnakeCaseInterceptor());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Telegram Service API')
    .setDescription('Telegram integration microservice for OTP, WebApp auth, and channel publishing')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // HTTP server
  const port = process.env['PORT'] || 3012;
  await app.listen(port);
  logger.log(`HTTP server running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
