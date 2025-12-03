import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MainServiceModule } from './main-service.module';

async function bootstrap() {
  const app = await NestFactory.create(MainServiceModule);

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS
  app.enableCors();

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Main Service API')
    .setDescription(
      'Load, Trip, and Transport management microservice with Event Sourcing'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3006;
  await app.listen(port);

  Logger.log(
    `🚀 Main Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(`📊 Health check: http://localhost:${port}/health`);
  Logger.log(`📖 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
