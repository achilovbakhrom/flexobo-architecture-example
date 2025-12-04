import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { BillingModule } from './billing.module';

async function bootstrap() {
  const logger = new Logger('BillingService');

  // Create HTTP application
  const app = await NestFactory.create(BillingModule, {
    rawBody: true, // Required for Stripe webhook signature validation
  });

  const configService = app.get(ConfigService);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Connect RabbitMQ microservice for consuming events
  const rabbitmqUrl = configService.get<string>(
    'RABBITMQ_URL',
    'amqp://guest:guest@localhost:5672',
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'billing_service',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Connect gRPC microservice
  const grpcPort = configService.get<number>('BILLING_GRPC_PORT', 50055);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'billing',
      protoPath: join(
        process.cwd(),
        'libs/shared-kernel/src/lib/grpc/proto/billing.proto',
      ),
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  // Start all microservices
  await app.startAllMicroservices();
  logger.log(`RabbitMQ microservice connected to ${rabbitmqUrl}`);
  logger.log(`gRPC server running on port ${grpcPort}`);

  // Start HTTP server
  const httpPort = configService.get<number>('PORT', 3005);
  await app.listen(httpPort);
  logger.log(`HTTP server running on port ${httpPort}`);
  logger.log(`Billing Service started successfully`);
}

bootstrap();
