/**
 * gRPC Authentication Guard
 *
 * This guard validates JWT tokens from gRPC metadata.
 * It extracts the token from the 'authorization' metadata field
 * and validates it using the injected ITokenValidator.
 *
 * Usage:
 * ```typescript
 * @UseGuards(GrpcAuthGuard)
 * @GrpcMethod('MyService', 'MyMethod')
 * async myMethod(data: Request, metadata: Metadata): Promise<Response> {
 *   // Access authenticated user via metadata or context
 * }
 * ```
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Metadata, status } from '@grpc/grpc-js';
import { ITokenValidator, TOKEN_VALIDATOR } from './token-validator.interface';

export interface GrpcAuthenticatedUser {
  userId: string;
  role: string;
  jti: string;
}

@Injectable()
export class GrpcAuthGuard implements CanActivate {
  private readonly logger = new Logger(GrpcAuthGuard.name);

  constructor(
    @Inject(TOKEN_VALIDATOR) private readonly tokenValidator: ITokenValidator
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rpcContext = context.switchToRpc();
    const metadata = rpcContext.getContext<Metadata>();

    const token = this.extractTokenFromMetadata(metadata);

    if (!token) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'No authorization token provided',
      });
    }

    const result = await this.tokenValidator.validate(token);

    if (!result.valid) {
      this.logger.warn(`Token validation failed: ${result.error}`);
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: result.error || 'Invalid token',
      });
    }

    // Attach user info to metadata for downstream handlers
    const user: GrpcAuthenticatedUser = {
      userId: result.userId || '',
      role: result.role || '',
      jti: result.jti || '',
    };

    // Store user in metadata for access in handlers
    metadata.set('user-id', user.userId);
    metadata.set('user-role', user.role);
    metadata.set('user-jti', user.jti);

    return true;
  }

  private extractTokenFromMetadata(metadata: Metadata): string | undefined {
    const authValues = metadata.get('authorization');

    if (!authValues || authValues.length === 0) {
      return undefined;
    }

    const authHeader = authValues[0];
    if (typeof authHeader !== 'string') {
      return undefined;
    }

    // Support both "Bearer <token>" and raw token
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }
}

/**
 * Helper to extract authenticated user from gRPC metadata
 */
export function getGrpcUser(metadata: Metadata): GrpcAuthenticatedUser | null {
  const userIdValues = metadata.get('user-id');
  const roleValues = metadata.get('user-role');
  const jtiValues = metadata.get('user-jti');

  if (!userIdValues || userIdValues.length === 0) {
    return null;
  }

  return {
    userId: String(userIdValues[0]),
    role: roleValues?.[0] ? String(roleValues[0]) : '',
    jti: jtiValues?.[0] ? String(jtiValues[0]) : '',
  };
}
