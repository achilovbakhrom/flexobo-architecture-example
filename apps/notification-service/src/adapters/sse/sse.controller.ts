import {
  Controller,
  Get,
  Query,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { SSEManagerService } from './sse-manager.service';

@ApiTags('SSE')
@Controller('api/v1/notifications')
export class SSEController {
  private readonly logger = new Logger(SSEController.name);

  constructor(
    private readonly sseManager: SSEManagerService,
    private readonly jwtService: JwtService
  ) {}

  @Get('stream')
  @ApiOperation({ summary: 'SSE stream for real-time notifications' })
  @ApiQuery({ name: 'token', required: true, description: 'JWT token' })
  async stream(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    let userId: string;

    try {
      const payload = this.jwtService.verify(token);
      userId = payload.user || payload.sub;

      if (!userId) {
        throw new UnauthorizedException('Invalid token');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    this.logger.log(`SSE connection established for user ${userId}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    this.sseManager.addConnection(userId, res);

    res.write(
      `event: connected\ndata: ${JSON.stringify({
        userId,
        connectedAt: new Date().toISOString(),
      })}\n\n`
    );

    const heartbeatInterval = setInterval(() => {
      res.write(
        `event: heartbeat\ndata: ${JSON.stringify({
          timestamp: Date.now(),
        })}\n\n`
      );
    }, 30000);

    res.on('close', () => {
      this.logger.log(`SSE connection closed for user ${userId}`);
      clearInterval(heartbeatInterval);
      this.sseManager.removeConnection(userId, res);
    });
  }
}
