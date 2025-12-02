import { Injectable, OnModuleInit, Logger, Inject, Optional } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable, timeout, catchError, of } from 'rxjs';
import { ITokenValidator, ITokenValidationResult, ITokenPayload } from './token-validator.interface';

/**
 * gRPC Users Service Interface
 */
interface UsersServiceClient {
  validateToken(data: { token: string }): Observable<ValidateTokenResponse>;
}

interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
  role?: string;
  jti?: string;
  error?: string;
}

/**
 * Injection token for the Users gRPC client
 */
export const USERS_GRPC_CLIENT = Symbol('USERS_GRPC_CLIENT');

/**
 * Configuration for GrpcTokenValidator
 */
export interface GrpcTokenValidatorConfig {
  /**
   * Timeout for gRPC calls in milliseconds
   * @default 5000
   */
  timeout?: number;
}

export const GRPC_TOKEN_VALIDATOR_CONFIG = Symbol('GRPC_TOKEN_VALIDATOR_CONFIG');

/**
 * gRPC Token Validator for services other than users-service
 *
 * Validates tokens by making a gRPC call to the users-service.
 * This allows other microservices to validate JWT tokens without
 * having access to the JWT secret or the user database.
 */
@Injectable()
export class GrpcTokenValidator implements ITokenValidator, OnModuleInit {
  private readonly logger = new Logger(GrpcTokenValidator.name);
  private usersService!: UsersServiceClient;
  private readonly timeoutMs: number;

  constructor(
    @Inject(USERS_GRPC_CLIENT) private readonly client: ClientGrpc,
    @Optional()
    @Inject(GRPC_TOKEN_VALIDATOR_CONFIG)
    config?: GrpcTokenValidatorConfig
  ) {
    this.timeoutMs = config?.timeout ?? 5000;
  }

  onModuleInit() {
    this.usersService = this.client.getService<UsersServiceClient>('UsersService');
  }

  async validate(token: string): Promise<ITokenValidationResult> {
    try {
      const response = await firstValueFrom(
        this.usersService.validateToken({ token }).pipe(
          timeout(this.timeoutMs),
          catchError((error) => {
            this.logger.error(
              `gRPC call to users-service failed: ${error.message}`,
              error.stack
            );
            return of({
              valid: false,
              error: 'Token validation service unavailable',
            } as ValidateTokenResponse);
          })
        )
      );

      if (!response.valid) {
        return {
          valid: false,
          error: response.error || 'Invalid token',
        };
      }

      const payload: ITokenPayload = {
        sub: response.userId || '',
        role: response.role || '',
        jti: response.jti || '',
      };

      return {
        valid: true,
        userId: response.userId,
        role: response.role,
        jti: response.jti,
        payload,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Token validation failed';
      this.logger.error(`Token validation error: ${message}`);
      return {
        valid: false,
        error: message,
      };
    }
  }
}
