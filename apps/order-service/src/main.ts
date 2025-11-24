/**
 * Order Service Entry Point
 */

import { config } from 'dotenv';

// Load environment variables from order-service .env
config({ path: 'apps/order-service/.env' });

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { enableGracefulShutdown } from '@flexobo/core';
import { OrderModule } from './order.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  const globalPrefix = 'api';
  const port = process.env.ORDER_SERVICE_PORT || 3000;

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3000',
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

  app.setGlobalPrefix(globalPrefix);

  const config = new DocumentBuilder()
    .setTitle('Order Service API')
    .setDescription('Order management with event sourcing and CQRS pattern.')
    .setVersion('1.0')

    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(`api/docs`, app, documentFactory, {
    jsonDocumentUrl: `/api/docs-json`,
  });

  await app.listen(port);
  Logger.log(
    `🚀 Order Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📊 Health check: http://localhost:${port}/${globalPrefix}/health`
  );
  Logger.log(`📖 Swagger UI: http://localhost:${port}/${globalPrefix}/docs`);

  // Enable graceful shutdown for HMR and proper cleanup
  enableGracefulShutdown(app, {
    serviceName: 'Order Service',
    timeout: 5000,
  });
}

bootstrap();
