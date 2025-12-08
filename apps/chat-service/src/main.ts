import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ChatModule } from './chat.module';
import { SnakeCaseInterceptor } from '@flexobo/shared-kernel';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(ChatModule);
  const logger = new Logger('ChatService');

  // Connect gRPC microservice
  const grpcPort = process.env.CHAT_GRPC_PORT || '50053';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'chat',
      protoPath: join(
        process.cwd(),
        'libs/shared-kernel/src/lib/grpc/proto/chat.proto'
      ),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

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

  // Global interceptors - snake_case response transformation
  app.useGlobalInterceptors(new SnakeCaseInterceptor());

  // Serve static files for uploads (will be removed when file service is fully integrated)
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

  // Start all microservices (gRPC)
  await app.startAllMicroservices();

  // HTTP server
  const port = process.env.CHAT_SERVICE_PORT || process.env.PORT || 3004;
  await app.listen(port);
  logger.log(`HTTP server running on http://localhost:${port}`);
  logger.log(`WebSocket server running on ws://localhost:${port}/chat`);
  logger.log(`gRPC server running on 0.0.0.0:${grpcPort}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
