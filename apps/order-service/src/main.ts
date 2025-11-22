/**
 * Order Service Entry Point
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  const globalPrefix = 'api';
  const port = process.env.PORT || 3000;

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  app.setGlobalPrefix(globalPrefix);
  await app.listen(port);
  Logger.log(
    `🚀 Order Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📊 Health check: http://localhost:${port}/${globalPrefix}/health`
  );
}

bootstrap();
