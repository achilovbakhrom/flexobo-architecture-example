import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  ISSEManager,
  SSEPayload,
  DisconnectReason,
} from '../../ports/sse-service.port';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  MESSAGE_PUBLISHER,
  IMessagePublisher,
} from '@flexobo/core';

interface ConnectionInfo {
  response: Response;
  connectedAt: Date;
  heartbeatInterval: NodeJS.Timeout;
  maxDurationTimeout: NodeJS.Timeout;
  isAuthenticated: boolean;
  userId: string | null; // Actual user ID if authenticated
}

// Max connection duration: 4 hours (client should auto-reconnect)
const MAX_CONNECTION_DURATION_MS = 4 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30000;

@Injectable()
export class SSEManagerService
  implements ISSEManager, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SSEManagerService.name);
  private readonly instanceId = uuidv4();
  private readonly connections = new Map<string, ConnectionInfo>();

  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn(
        'RabbitMQ not connected, SSE broadcast via RabbitMQ disabled'
      );
      return;
    }

    const queueName = `notification.sse.${this.instanceId}`;

    try {
      await this.rabbitMQConsumer.subscribeToEvents(
        queueName,
        ['sse.user.*', 'sse.broadcast'],
        async (message) => {
          const routingKey = message.metadata?.routingKey as string;
          const payload = message.content as SSEPayload;

          if (routingKey === 'sse.broadcast') {
            this.broadcastLocal(payload);
          } else if (routingKey?.startsWith('sse.user.')) {
            const userId = routingKey.replace('sse.user.', '');
            this.sendToUserLocal(userId, payload);
          }

          message.ack();
        },
        { durable: false, exclusive: false, autoDelete: true }
      );
    } catch (error) {
      this.logger.warn(`Failed to subscribe to SSE events: ${error}`);
      // Non-fatal - SSE will work locally but not across instances
    }

    this.logger.log(
      `SSE Manager initialized with instance ID: ${this.instanceId}`
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down SSE Manager, closing all connections...');

    // Close all connections gracefully
    for (const [userId, connectionInfo] of this.connections) {
      this.closeConnection(userId, connectionInfo, {
        reason: 'server_shutdown',
        message: 'Server is shutting down',
      });
    }

    this.connections.clear();
    this.logger.log('All SSE connections closed');
  }

  addConnection(
    connectionId: string,
    response: Response,
    isAuthenticated = false,
    userId: string | null = null
  ): boolean {
    const existingConnection = this.connections.get(connectionId);
    let replacedExisting = false;

    // If connection already exists, close it gracefully
    if (existingConnection) {
      this.logger.debug(
        `Closing existing connection: ${connectionId} (new connection)`
      );
      this.closeConnection(connectionId, existingConnection, {
        reason: 'new_connection',
        message: 'New connection established from another client',
      });
      replacedExisting = true;
    }

    // Set up heartbeat interval
    const heartbeatInterval = setInterval(() => {
      this.sendHeartbeat(connectionId, response);
    }, HEARTBEAT_INTERVAL_MS);

    // Set up max duration timeout
    const maxDurationTimeout = setTimeout(() => {
      this.logger.debug(
        `Max connection duration reached for ${connectionId}, closing connection`
      );
      const conn = this.connections.get(connectionId);
      if (conn && conn.response === response) {
        this.closeConnection(connectionId, conn, {
          reason: 'max_duration',
          message: 'Maximum connection duration reached, please reconnect',
        });
        this.connections.delete(connectionId);
      }
    }, MAX_CONNECTION_DURATION_MS);

    // Store the connection info
    this.connections.set(connectionId, {
      response,
      connectedAt: new Date(),
      heartbeatInterval,
      maxDurationTimeout,
      isAuthenticated,
      userId,
    });

    this.logger.debug(
      `Added connection: ${connectionId} (auth: ${isAuthenticated}, user: ${
        userId || 'N/A'
      }). Total: ${this.connections.size}`
    );

    return replacedExisting;
  }

  removeConnection(connectionId: string, response: Response): void {
    const connectionInfo = this.connections.get(connectionId);

    // Only remove if it's the same response object (prevent removing new connection)
    if (connectionInfo && connectionInfo.response === response) {
      this.cleanupConnection(connectionInfo);
      this.connections.delete(connectionId);

      this.logger.debug(
        `Removed connection: ${connectionId}. Total connections: ${this.connections.size}`
      );
    }
  }

  async sendToUser(userId: string, payload: SSEPayload): Promise<void> {
    await this.messagePublisher.publish('flexobo.events', payload, {
      routingKey: `sse.user.${userId}`,
    });
  }

  async sendToUsers(userIds: string[], payload: SSEPayload): Promise<void> {
    await Promise.all(
      userIds.map((userId) => this.sendToUser(userId, payload))
    );
  }

  async broadcast(payload: SSEPayload): Promise<void> {
    await this.messagePublisher.publish('flexobo.events', payload, {
      routingKey: 'sse.broadcast',
    });
  }

  getConnectedUserCount(): number {
    return this.connections.size;
  }

  isUserConnected(userId: string): boolean {
    return this.connections.has(userId);
  }

  private sendToUserLocal(userId: string, payload: SSEPayload): void {
    // Find all connections for this user (supports multiple devices/tabs)
    const userConnections: Array<{
      connectionId: string;
      info: ConnectionInfo;
    }> = [];

    for (const [connectionId, info] of this.connections) {
      if (info.userId === userId && info.isAuthenticated) {
        userConnections.push({ connectionId, info });
      }
    }

    if (userConnections.length === 0) {
      return;
    }

    const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
    const brokenConnections: string[] = [];

    // Send to all user's connections
    for (const { connectionId, info } of userConnections) {
      try {
        info.response.write(data);
      } catch (error) {
        this.logger.error(
          `Error sending SSE to user ${userId} (connection ${connectionId}): ${error}`
        );
        // Mark for cleanup
        brokenConnections.push(connectionId);
      }
    }

    // Clean up broken connections
    for (const connectionId of brokenConnections) {
      const connectionInfo = this.connections.get(connectionId);
      if (connectionInfo) {
        this.cleanupConnection(connectionInfo);
        this.connections.delete(connectionId);
      }
    }

    this.logger.debug(
      `Sent notification to user ${userId}: ${userConnections.length} connection(s), ${brokenConnections.length} failed`
    );
  }

  private broadcastLocal(payload: SSEPayload): void {
    const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const [connectionId, connectionInfo] of this.connections) {
      try {
        connectionInfo.response.write(data);
      } catch (error) {
        this.logger.error(
          `Error broadcasting SSE to connection ${connectionId}: ${error}`
        );
        // Connection is broken, clean it up
        this.cleanupConnection(connectionInfo);
        this.connections.delete(connectionId);
      }
    }
  }

  private sendHeartbeat(connectionId: string, response: Response): void {
    const connectionInfo = this.connections.get(connectionId);

    // Verify the response is still the current one for this connection
    if (!connectionInfo || connectionInfo.response !== response) {
      return;
    }

    try {
      response.write(
        `event: heartbeat\ndata: ${JSON.stringify({
          timestamp: Date.now(),
        })}\n\n`
      );
    } catch (error) {
      this.logger.error(
        `Error sending heartbeat to connection ${connectionId}: ${error}`
      );
      // Connection is broken, clean it up
      this.cleanupConnection(connectionInfo);
      this.connections.delete(connectionId);
    }
  }

  private closeConnection(
    connectionId: string,
    connectionInfo: ConnectionInfo,
    reason: DisconnectReason
  ): void {
    try {
      // Send disconnect event before closing
      connectionInfo.response.write(
        `event: disconnect\ndata: ${JSON.stringify(reason)}\n\n`
      );
      connectionInfo.response.end();
    } catch {
      // Ignore errors when closing - connection might already be closed
    }

    this.cleanupConnection(connectionInfo);
  }

  private cleanupConnection(connectionInfo: ConnectionInfo): void {
    // Clear heartbeat interval
    if (connectionInfo.heartbeatInterval) {
      clearInterval(connectionInfo.heartbeatInterval);
    }

    // Clear max duration timeout
    if (connectionInfo.maxDurationTimeout) {
      clearTimeout(connectionInfo.maxDurationTimeout);
    }
  }
}
