import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { UsersGrpcClient } from '../clients/users-grpc.client';

export interface AuthenticatedSocket extends Socket {
  user: {
    userId: string;
    role: string;
    jti: string;
  };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly usersGrpcClient: UsersGrpcClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('No token provided');
      }

      const result = await this.usersGrpcClient.validateToken(token);

      if (!result.valid) {
        throw new WsException(result.error || 'Invalid token');
      }

      // Attach user info to socket
      (client as AuthenticatedSocket).user = {
        userId: result.userId,
        role: result.role,
        jti: result.jti,
      };

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      this.logger.error(`WebSocket auth failed: ${message}`);
      throw new WsException(message);
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    // Try to get token from handshake auth
    const authToken = client.handshake?.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Try to get token from query string
    const queryToken = client.handshake?.query?.token;
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }

    // Try to get token from headers
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      return type === 'Bearer' ? token : undefined;
    }

    return undefined;
  }
}

/**
 * Helper function to extract user from socket for use in gateway methods
 */
export function getUserFromSocket(client: Socket): { userId: string; role: string; jti: string } {
  const authenticatedSocket = client as AuthenticatedSocket;
  if (!authenticatedSocket.user) {
    throw new WsException('User not authenticated');
  }
  return authenticatedSocket.user;
}
