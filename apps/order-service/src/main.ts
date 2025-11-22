/**
 * Order Service Entry Point
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OrderModule } from './order.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  const globalPrefix = 'api';
  const port = process.env.ORDER_SERVICE_PORT || 3000;

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

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Order Service API')
    .setDescription('Order management with event sourcing and CQRS')
    .setVersion('1.0')
    .addTag('orders')
    .addServer(`http://localhost:${port}`, 'Order Service')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);

  // Expose JSON spec for aggregation
  app.use(
    `${globalPrefix}/docs-json`,
    (_req: never, res: { json: (data: unknown) => void }) => {
      res.json(document);
    }
  );

  await app.listen(port);
  Logger.log(
    `🚀 Order Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📊 Health check: http://localhost:${port}/${globalPrefix}/health`
  );
  Logger.log(`📖 Swagger UI: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
