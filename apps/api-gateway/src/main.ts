import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GatewayModule } from './gateway/gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  const port = process.env.API_GATEWAY_PORT || 3001;

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || 'http://localhost:3000';
  const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:3002';

  const config = new DocumentBuilder()
    .setTitle('Flexobo API Gateway')
    .setDescription('Unified API documentation aggregating all microservices')
    .setVersion('1.0')
    .addServer(orderServiceUrl, 'Order Service')
    .addServer(adminPanelUrl, 'Admin Panel')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT token',
    })
    .build();

  Logger.log('📖 Fetching Swagger specs from services...');

  const gatewayDocument = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, gatewayDocument, {
    explorer: true,
    swaggerOptions: {
      urls: [
        {
          name: 'API Gateway',
          url: '/api/docs-json',
        },
        {
          name: 'Order Service',
          url: `${orderServiceUrl}/api/docs-json`,
        },
        {
          name: 'Admin Panel',
          url: `${adminPanelUrl}/api/docs-json`,
        },
      ],
    },
    customSiteTitle: 'Flexobo API Documentation',
  });

  await app.listen(port);

  Logger.log(`🚪 API Gateway: http://localhost:${port}`);
  Logger.log(`📊 Health: http://localhost:${port}/api/health`);
  Logger.log(`📖 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
