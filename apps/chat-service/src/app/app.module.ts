import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma.module';
import { ChatService } from '../application/services/chat.service';
import { ChatController } from '../adapters/http/v1/chat.controller';
import { ChatGateway } from '../adapters/websocket/chat.gateway';
import { UsersGrpcClient } from '../infrastructure/clients/users-grpc.client';
import { WsJwtGuard } from '../infrastructure/guards/ws-jwt.guard';
import { HttpJwtAuthGuard } from '../infrastructure/guards/http-jwt-auth.guard';
import { StorageService } from '../infrastructure/services/storage.service';
import configuration from '../config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatGateway,
    UsersGrpcClient,
    WsJwtGuard,
    HttpJwtAuthGuard,
    StorageService,
  ],
})
export class AppModule {}
