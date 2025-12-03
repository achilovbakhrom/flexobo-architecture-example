import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@flexobo/shared-kernel';
import {
  ITokenService,
  TOKEN_SERVICE,
  ITokenRepository,
  TOKEN_REPOSITORY,
  IUserRepository,
  USER_REPOSITORY,
  ITokenPayload,
  UserStatus,
} from '../../../ports';

export interface AuthenticatedRequest extends Request {
  user: ITokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(TOKEN_REPOSITORY)
    private readonly tokenRepository: ITokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // 1. Verify JWT signature and get payload
      const payload = this.tokenService.verifyAccessToken(token);

      // 2. Check if token is blacklisted
      const isBlacklisted = await this.tokenRepository.isTokenBlacklisted(
        payload.jti
      );

      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // 3. Check if user exists and is active
      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.status !== UserStatus.Active) {
        throw new UnauthorizedException('User account is not active');
      }

      // Attach user payload to request
      request.user = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        jti: payload.jti,
      };

      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Invalid token';
      throw new UnauthorizedException(message);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader || Array.isArray(authHeader)) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
