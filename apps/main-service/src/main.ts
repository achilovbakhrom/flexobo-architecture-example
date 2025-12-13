import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { MainModule } from './main.module';
import {
  TransformResponseInterceptor,
  LanguageFilterInterceptor,
  SnakeCaseInterceptor,
} from '@flexobo/shared-kernel';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const isDev = process.env.MODE !== 'prod';

  console.log('------------isDev 2--------', isDev);

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

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );
  app.useGlobalInterceptors(
    new TransformResponseInterceptor(),
    new LanguageFilterInterceptor(),
    new SnakeCaseInterceptor()
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Main Service API')
    .setDescription(
      'API for Load, Trip, Bid, Booking, Transport, and Board management'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // gRPC microservice
  const grpcPort = process.env.GRPC_PORT || '50051';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'reference_data',
      protoPath: join(
        process.cwd(),
        'libs/shared-kernel/src/lib/grpc/proto/reference-data.proto'
      ),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();
  Logger.log(`gRPC server running on port ${grpcPort}`);

  // HTTP server
  const port = process.env.PORT || 3004;
  await app.listen(port);
  Logger.log(
    `Main Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(`Swagger docs available at: http://localhost:${port}/docs`);
}

bootstrap();
