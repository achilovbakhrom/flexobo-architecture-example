import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { enableGracefulShutdown } from '@flexobo/core';
import { GatewayModule } from './gateway/gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('gateway.port', 3001);
  const corsOrigin = configService.get<string>('gateway.corsOrigin', '*');
  const orderServiceUrl = configService.get<string>(
    'gateway.orderServiceUrl',
    'http://localhost:3000'
  );
  const adminPanelUrl = configService.get<string>(
    'gateway.adminPanelUrl',
    'http://localhost:3002'
  );
  const gatewayUrl = configService.get<string>(
    'gateway.gatewayUrl',
    `http://localhost:${port}`
  );

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  const config = new DocumentBuilder()
    .setTitle('Flexobo API Gateway')
    .setDescription('Unified API documentation aggregating all microservices')
    .setVersion('1.0')
    .addServer(gatewayUrl, 'Api Gateway')
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

  enableGracefulShutdown(app, {
    serviceName: 'API Gateway',
    timeout: 5000,
  });
}

bootstrap();
