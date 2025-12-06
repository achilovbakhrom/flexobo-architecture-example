import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ITokenValidator, TOKEN_VALIDATOR } from './token-validator.interface';

export interface WsUser {
  id: string;
  role: string;
  companyId?: string;
  [key: string]: unknown;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(TOKEN_VALIDATOR)
    private readonly tokenValidator?: ITokenValidator
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const client = context.switchToWs().getClient<Socket>();

    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Authentication token required');
      }

      const user = await this.validateToken(token);

      if (!user) {
        throw new WsException('Invalid authentication token');
      }

      // Attach user to socket data for later use
      client.data.user = user;

      return true;
    } catch (error) {
      this.logger.warn(`WebSocket authentication failed: ${error}`);
      throw new WsException('Authentication failed');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from handshake auth
    const auth = client.handshake?.auth as Record<string, unknown> | undefined;
    const authToken = auth?.['token'];
    if (authToken && typeof authToken === 'string') {
      return authToken;
    }

    // Try to get token from handshake headers (Authorization: Bearer <token>)
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query string
    const query = client.handshake?.query as Record<string, unknown> | undefined;
    const queryToken = query?.['token'];
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  private async validateToken(token: string): Promise<WsUser | null> {
    if (!this.tokenValidator) {
      // Fallback: decode JWT without validation (not recommended for production)
      try {
        const payload = this.decodeToken(token);
        const userId = (payload['user'] || payload['sub'] || payload['id']) as string;
        const role = (payload['role'] as string) || 'USER';
        const companyId = payload['companyId'] as string | undefined;
        return {
          id: userId,
          role,
          companyId,
          ...payload,
        };
      } catch {
        return null;
      }
    }

    try {
      const result = await this.tokenValidator.validate(token);
      if (!result.valid || !result.payload) {
        return null;
      }

      const { role, sub, ...restPayload } = result.payload;
      return {
        id: sub,
        role: role || 'USER',
        companyId: result.userId,
        ...restPayload,
      };
    } catch {
      return null;
    }
  }

  private decodeToken(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  }
}

/**
 * Helper to get user from WebSocket context
 */
export function getWsUser(client: Socket): WsUser | undefined {
  return client.data?.user;
}
