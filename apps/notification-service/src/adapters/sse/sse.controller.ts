import { Controller, Get, Query, Res, Logger, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { SSEManagerService } from './sse-manager.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('SSE')
@Controller('api/v1/notifications')
export class SSEController {
  private readonly logger = new Logger(SSEController.name);

  constructor(
    private readonly sseManager: SSEManagerService,
    private readonly jwtService: JwtService
  ) {}

  @Get('stream')
  @ApiOperation({
    summary: 'SSE stream for real-time notifications',
    description:
      'Establishes SSE connection. Can be used with or without authentication. ' +
      'Anonymous users get a session ID. Authenticated users can receive personalized notifications.',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'JWT token for authenticated connection (optional)',
  })
  async stream(
    @Query('token') token: string | undefined,
    @Headers('x-session-id') sessionId: string | undefined,
    @Res() res: Response
  ) {
    let connectionId: string;
    let userId: string | null = null;
    let isAuthenticated = false;

    // Try to authenticate if token is provided
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.user || payload.sub;

        if (userId) {
          connectionId = userId;
          isAuthenticated = true;
          this.logger.log(`Authenticated SSE connection for user ${userId}`);
        } else {
          this.logger.warn('Token provided but no user ID found');
          connectionId = sessionId || `anonymous-${uuidv4()}`;
        }
      } catch (error) {
        const e = error as any;
        if (e) {
          this.logger.warn(`Invalid token provided: ${e.message}`);
        }
        connectionId = sessionId || `anonymous-${uuidv4()}`;
      }
    } else {
      // Anonymous connection - use session ID or generate new one
      connectionId = sessionId || `anonymous-${uuidv4()}`;
      this.logger.log(`Anonymous SSE connection: ${connectionId}`);
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Add connection to manager
    const replacedExisting = this.sseManager.addConnection(
      connectionId,
      res,
      isAuthenticated,
      userId
    );

    // Send connected event with connection info
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        connectionId,
        userId: isAuthenticated ? userId : null,
        isAuthenticated,
        connectedAt: new Date().toISOString(),
        replacedExisting,
      })}\n\n`
    );

    // Handle connection close
    res.on('close', () => {
      this.logger.log(`SSE connection closed: ${connectionId}`);
      this.sseManager.removeConnection(connectionId, res);
    });
  }
}
