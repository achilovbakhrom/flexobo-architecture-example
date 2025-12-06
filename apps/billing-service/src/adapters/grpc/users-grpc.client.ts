import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientGrpc,
  Transport,
  ClientProxyFactory,
} from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom } from 'rxjs';

interface ValidateTokenRequest {
  token: string;
}

interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  role: string;
  jti: string;
  error: string;
}

interface GetUserRequest {
  userId: string;
}

interface GetUserResponse {
  found: boolean;
  user?: UserInfo;
}

interface GetUsersRequest {
  userIds: string[];
}

interface GetUsersResponse {
  users: UserInfo[];
}

interface IsTokenBlacklistedRequest {
  jti: string;
}

interface IsTokenBlacklistedResponse {
  blacklisted: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  avatar: string;
  role: string;
  language: string;
  isActive: boolean;
}

interface UsersServiceGrpc {
  validateToken(data: ValidateTokenRequest): Observable<ValidateTokenResponse>;
  getUser(data: GetUserRequest): Observable<GetUserResponse>;
  getUsers(data: GetUsersRequest): Observable<GetUsersResponse>;
  isTokenBlacklisted(
    data: IsTokenBlacklistedRequest
  ): Observable<IsTokenBlacklistedResponse>;
}

@Injectable()
export class UsersGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(UsersGrpcClient.name);
  private usersService!: UsersServiceGrpc;
  private client!: ClientGrpc;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const grpcUrl = this.configService.get<string>(
      'USERS_GRPC_URL',
      'localhost:50052'
    );

    this.client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        package: 'users',
        protoPath: join(
          process.cwd(),
          'libs/shared-kernel/src/lib/grpc/proto/users.proto'
        ),
        url: grpcUrl,
      },
    }) as unknown as ClientGrpc;

    this.usersService =
      this.client.getService<UsersServiceGrpc>('UsersService');
    this.logger.log(`Connected to Users gRPC service at ${grpcUrl}`);
  }

  async validateToken(token: string): Promise<ValidateTokenResponse> {
    try {
      return await firstValueFrom(this.usersService.validateToken({ token }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to validate token: ${message}`);
      return {
        valid: false,
        userId: '',
        role: '',
        jti: '',
        error: message,
      };
    }
  }

  async getUser(userId: string): Promise<UserInfo | null> {
    try {
      const response = await firstValueFrom(
        this.usersService.getUser({ userId })
      );
      return response.found ? response.user ?? null : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user ${userId}: ${message}`);
      return null;
    }
  }

  async getUsers(userIds: string[]): Promise<UserInfo[]> {
    try {
      const response = await firstValueFrom(
        this.usersService.getUsers({ userIds })
      );
      return response.users;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get users: ${message}`);
      return [];
    }
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.usersService.isTokenBlacklisted({ jti })
      );
      return response.blacklisted;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check token blacklist: ${message}`);
      return false;
    }
  }
}
