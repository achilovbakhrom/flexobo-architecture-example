import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersGrpcClient } from '../clients/users-grpc.client';

@Injectable()
export class HttpJwtAuthGuard implements CanActivate {
  constructor(private readonly usersGrpcClient: UsersGrpcClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const result = await this.usersGrpcClient.validateToken(token);

    if (!result.valid) {
      throw new UnauthorizedException(result.error || 'Invalid token');
    }

    // Attach user info to request
    request.user = {
      userId: result.userId,
      role: result.role,
      jti: result.jti,
    };

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
