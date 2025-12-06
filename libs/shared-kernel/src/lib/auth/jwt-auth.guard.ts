/**
 * JWT Authentication Guard
 *
 * This guard supports two validation modes:
 * 1. Local validation (for users-service) - validates JWT locally and checks blacklist
 * 2. Remote validation (for other services) - validates via gRPC call to users-service
 *
 * The validation strategy is determined by the TOKEN_VALIDATOR provider.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ITokenValidator, TOKEN_VALIDATOR } from './token-validator.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VALIDATOR) private readonly tokenValidator: ITokenValidator,
    @Optional() private readonly reflector?: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        return true;
      }
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const result = await this.tokenValidator.validate(token);

    if (!result.valid) {
      throw new UnauthorizedException(result.error || 'Invalid token');
    }

    // Attach user payload to request
    // Include both 'sub' (JWT standard) and 'userId' (backward compatibility)
    const userId = result.userId || result.payload?.sub || '';
    request.user = {
      ...result.payload,
      sub: userId,
      userId: userId, // Alias for backward compatibility
      role: result.role || result.payload?.role || '',
      jti: result.jti || result.payload?.jti || '',
    };

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers?.authorization;
    if (!authHeader || Array.isArray(authHeader)) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
