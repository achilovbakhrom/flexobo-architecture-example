import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import {
  LanguageFilterInterceptor,
  SnakeCaseInterceptor,
  TransformResponseInterceptor,
} from '@flexobo/shared-kernel';

import { UsersModule } from './users.module';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  const logger = new Logger('UsersService');

  const isDev = process.env.MODE !== 'prod';

  app.enableCors({
    origin: isDev
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
        ]
      : [
          'https://app.flexobo.com',
          'https://admin.flexobo.com',
          'https://flexobo.com',
        ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
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
  app.useGlobalInterceptors(
    new TransformResponseInterceptor(),
    new SnakeCaseInterceptor(),
    new LanguageFilterInterceptor()
  );
  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Users Service API')
    .setDescription('Users and Authentication microservice')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // gRPC microservice
  const grpcPort = process.env.GRPC_PORT || '50052';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'users',
      protoPath: join(
        process.cwd(),
        'libs/shared-kernel/src/lib/grpc/proto/users.proto'
      ),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();
  logger.log(`gRPC server running on port ${grpcPort}`);

  // HTTP server
  const port = process.env.PORT || 3005;
  await app.listen(port);
  logger.log(`HTTP server running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
