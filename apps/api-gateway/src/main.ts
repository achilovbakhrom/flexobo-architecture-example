import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { enableGracefulShutdown } from '@flexobo/core';
import { GatewayModule } from './gateway/gateway.module';
import { WebSocketProxyService } from './gateway/services';

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

  // Enable CORS for HTTP
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Correlation-ID',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Flexobo API Gateway')
    .setDescription(
      `Unified API Gateway aggregating all microservices.

## Features
- **HTTP Proxy**: Routes all HTTP requests to appropriate microservices
- **WebSocket Proxy**: Supports WebSocket connections at /ws
- **Service Discovery**: Dynamic service registration and health monitoring
- **Circuit Breaker**: Automatic failure handling with circuit breaker pattern
- **Health Checks**: Periodic health monitoring of all registered services

## WebSocket Connection
Connect to WebSocket at: \`ws://localhost:${port}/ws/{service-path}\`

Example: \`ws://localhost:${port}/ws/orders\` will proxy to order-service WebSocket
`
    )
    .setVersion('1.0')
    .addServer(gatewayUrl, 'API Gateway')
    .addServer(orderServiceUrl, 'Order Service (Direct)')
    .addServer(adminPanelUrl, 'Admin Panel (Direct)')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT token',
    })
    .addTag('Gateway', 'Gateway management endpoints')
    .addTag('Service Discovery', 'Service discovery and documentation')
    .build();

  Logger.log('📖 Setting up Swagger documentation...');

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
          url: '/api/discovery/swagger/order-service',
        },
        {
          name: 'Admin Panel',
          url: '/api/discovery/swagger/admin-panel',
        },
      ],
      persistAuthorization: true,
    },
    customSiteTitle: 'Flexobo API Documentation',
  });

  // Get HTTP server for WebSocket attachment
  const httpServer = app.getHttpServer();

  // Initialize WebSocket proxy
  const wsProxy = app.get(WebSocketProxyService);
  wsProxy.initialize(httpServer, {
    path: '/ws',
    pingInterval: 30000,
    pingTimeout: 10000,
    maxPayload: 1024 * 1024, // 1MB
  });

  await app.listen(port);

  Logger.log('');
  Logger.log('🚀 ════════════════════════════════════════════════════════');
  Logger.log(`🚪 API Gateway running at: http://localhost:${port}`);
  Logger.log(`📊 Health Check: http://localhost:${port}/api/health`);
  Logger.log(`🔍 Gateway Status: http://localhost:${port}/api/gateway/status`);
  Logger.log(`📖 Swagger Docs: http://localhost:${port}/api/docs`);
  Logger.log(`🔌 WebSocket: ws://localhost:${port}/ws`);
  Logger.log('════════════════════════════════════════════════════════ 🚀');
  Logger.log('');

  // Handle graceful shutdown
  const shutdown = async () => {
    Logger.log('Closing WebSocket connections...');
    wsProxy.shutdown();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  enableGracefulShutdown(app, {
    serviceName: 'API Gateway',
    timeout: 5000,
  });
}

bootstrap();
