import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersGrpcClient } from '../../grpc/users-grpc.client';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthenticatedUser {
  userId: string;
  role: string;
  jti: string;
  email?: string;
  companyId?: string;
}

// CurrentUserData is an alias for AuthenticatedUser for consistency
export type CurrentUserData = AuthenticatedUser;

// CurrentUser parameter decorator to extract user from request
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly usersClient: UsersGrpcClient,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const validationResult = await this.usersClient.validateToken(token);

      if (!validationResult.valid) {
        throw new UnauthorizedException(
          validationResult.error || 'Invalid token'
        );
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.usersClient.isTokenBlacklisted(
        validationResult.jti
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Attach user info to request
      request.user = {
        userId: validationResult.userId,
        role: validationResult.role,
        jti: validationResult.jti,
      } as AuthenticatedUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }

  private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
