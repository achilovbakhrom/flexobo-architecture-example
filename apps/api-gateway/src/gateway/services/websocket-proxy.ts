/**
 * WebSocket Proxy Service
 *
 * Handles WebSocket connection upgrades and proxies them to backend services.
 * Supports multiple services with different WebSocket endpoints.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createServer, Server } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import {
  IServiceRegistry,
  IRouteRegistry,
  ServiceDefinition,
  SERVICE_REGISTRY,
  ROUTE_REGISTRY,
} from '../interfaces';

export interface WebSocketConnection {
  id: string;
  clientSocket: WebSocket;
  targetSocket: WebSocket | null;
  service: ServiceDefinition;
  path: string;
  createdAt: Date;
}

export interface WebSocketProxyConfig {
  /** WebSocket path prefix for the gateway */
  path: string;
  /** Ping interval in ms */
  pingInterval: number;
  /** Ping timeout in ms */
  pingTimeout: number;
  /** Max payload size in bytes */
  maxPayload: number;
}

@Injectable()
export class WebSocketProxyService {
  private readonly logger = new Logger(WebSocketProxyService.name);
  private wss: WebSocketServer | null = null;
  private readonly connections = new Map<string, WebSocketConnection>();
  private pingIntervalId: NodeJS.Timeout | null = null;

  private config: WebSocketProxyConfig = {
    path: '/ws',
    pingInterval: 30000,
    pingTimeout: 10000,
    maxPayload: 1024 * 1024, // 1MB
  };

  constructor(
    @Inject(SERVICE_REGISTRY)
    private readonly serviceRegistry: IServiceRegistry,
    @Inject(ROUTE_REGISTRY)
    private readonly routeRegistry: IRouteRegistry,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server, config?: Partial<WebSocketProxyConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.wss = new WebSocketServer({
      server,
      path: this.config.path,
      maxPayload: this.config.maxPayload,
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      this.logger.error(`WebSocket server error: ${error.message}`);
    });

    // Start ping interval for connection health
    this.startPingInterval();

    this.logger.log(
      `WebSocket proxy initialized on path: ${this.config.path}`
    );
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(
    clientSocket: WebSocket,
    req: { url?: string; headers: { [key: string]: string | string[] | undefined } }
  ): void {
    const connectionId = this.generateConnectionId();
    const wsPath = this.extractWsPath(req.url || '');

    this.logger.debug(`New WebSocket connection: ${connectionId} for path: ${wsPath}`);

    // Find target service based on path
    const routeMatch = this.routeRegistry.findRoute(wsPath);

    if (!routeMatch) {
      this.logger.warn(`No service found for WebSocket path: ${wsPath}`);
      clientSocket.close(4004, 'No service found for path');
      return;
    }

    const service = routeMatch.service;

    if (!service.wsPath) {
      this.logger.warn(`Service ${service.name} does not support WebSocket`);
      clientSocket.close(4005, 'Service does not support WebSocket');
      return;
    }

    // Create connection record
    const connection: WebSocketConnection = {
      id: connectionId,
      clientSocket,
      targetSocket: null,
      service,
      path: wsPath,
      createdAt: new Date(),
    };

    this.connections.set(connectionId, connection);

    // Connect to target service
    this.connectToTarget(connection, req.headers);

    // Handle client events
    clientSocket.on('message', (data) => {
      this.handleClientMessage(connectionId, data);
    });

    clientSocket.on('close', (code, reason) => {
      this.handleClientClose(connectionId, code, reason.toString());
    });

    clientSocket.on('error', (error) => {
      this.logger.error(
        `Client socket error for ${connectionId}: ${error.message}`
      );
    });

    clientSocket.on('pong', () => {
      // Connection is alive
      (clientSocket as unknown as { isAlive: boolean }).isAlive = true;
    });

    // Mark as alive
    (clientSocket as unknown as { isAlive: boolean }).isAlive = true;

    this.eventEmitter.emit('websocket.connected', {
      connectionId,
      service: service.name,
      path: wsPath,
    });
  }

  /**
   * Connect to target service WebSocket
   */
  private connectToTarget(
    connection: WebSocketConnection,
    headers: { [key: string]: string | string[] | undefined }
  ): void {
    const { service, path, id: connectionId } = connection;
    const wsUrl = this.buildTargetWsUrl(service, path);

    this.logger.debug(`Connecting to target: ${wsUrl}`);

    // Forward relevant headers
    const forwardHeaders: Record<string, string> = {};
    const headersToForward = [
      'authorization',
      'cookie',
      'x-request-id',
      'x-correlation-id',
    ];

    for (const header of headersToForward) {
      const value = headers[header];
      if (value) {
        forwardHeaders[header] = Array.isArray(value) ? value[0] : value;
      }
    }

    try {
      const targetSocket = new WebSocket(wsUrl, {
        headers: forwardHeaders,
      });

      targetSocket.on('open', () => {
        this.logger.debug(`Target connection established for ${connectionId}`);
        connection.targetSocket = targetSocket;

        this.eventEmitter.emit('websocket.target.connected', {
          connectionId,
          service: service.name,
        });
      });

      targetSocket.on('message', (data) => {
        this.handleTargetMessage(connectionId, data);
      });

      targetSocket.on('close', (code, reason) => {
        this.handleTargetClose(connectionId, code, reason.toString());
      });

      targetSocket.on('error', (error) => {
        this.logger.error(
          `Target socket error for ${connectionId}: ${error.message}`
        );
        this.closeConnection(connectionId, 1011, 'Target connection error');
      });
    } catch (error) {
      this.logger.error(
        `Failed to connect to target: ${(error as Error).message}`
      );
      connection.clientSocket.close(1011, 'Failed to connect to service');
      this.connections.delete(connectionId);
    }
  }

  /**
   * Handle message from client
   */
  private handleClientMessage(connectionId: string, data: RawData): void {
    const connection = this.connections.get(connectionId);

    if (!connection || !connection.targetSocket) {
      return;
    }

    if (connection.targetSocket.readyState === WebSocket.OPEN) {
      connection.targetSocket.send(data);
    }
  }

  /**
   * Handle message from target service
   */
  private handleTargetMessage(connectionId: string, data: RawData): void {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    if (connection.clientSocket.readyState === WebSocket.OPEN) {
      connection.clientSocket.send(data);
    }
  }

  /**
   * Handle client socket close
   */
  private handleClientClose(
    connectionId: string,
    code: number,
    reason: string
  ): void {
    this.logger.debug(
      `Client closed connection ${connectionId}: ${code} - ${reason}`
    );

    const connection = this.connections.get(connectionId);

    if (connection?.targetSocket) {
      connection.targetSocket.close(code, reason);
    }

    this.connections.delete(connectionId);

    this.eventEmitter.emit('websocket.disconnected', {
      connectionId,
      initiator: 'client',
      code,
      reason,
    });
  }

  /**
   * Handle target socket close
   */
  private handleTargetClose(
    connectionId: string,
    code: number,
    reason: string
  ): void {
    this.logger.debug(
      `Target closed connection ${connectionId}: ${code} - ${reason}`
    );

    const connection = this.connections.get(connectionId);

    if (connection?.clientSocket) {
      connection.clientSocket.close(code, reason);
    }

    this.connections.delete(connectionId);

    this.eventEmitter.emit('websocket.disconnected', {
      connectionId,
      initiator: 'target',
      code,
      reason,
    });
  }

  /**
   * Close a connection
   */
  closeConnection(connectionId: string, code: number, reason: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    if (connection.clientSocket.readyState === WebSocket.OPEN) {
      connection.clientSocket.close(code, reason);
    }

    if (connection.targetSocket?.readyState === WebSocket.OPEN) {
      connection.targetSocket.close(code, reason);
    }

    this.connections.delete(connectionId);
  }

  /**
   * Build target WebSocket URL
   */
  private buildTargetWsUrl(service: ServiceDefinition, path: string): string {
    const baseUrl = service.baseUrl.replace(/^http/, 'ws');
    const wsPath = service.wsPath || '/ws';

    // Extract the path after the route prefix
    const routeMatch = this.routeRegistry.findRoute(path);
    const targetPath = routeMatch?.transformedPath || '';

    return `${baseUrl}${wsPath}${targetPath}`;
  }

  /**
   * Extract WebSocket path from URL
   */
  private extractWsPath(url: string): string {
    // Remove the gateway WebSocket path prefix
    const wsPrefix = this.config.path;
    let path = url;

    if (path.startsWith(wsPrefix)) {
      path = path.substring(wsPrefix.length);
    }

    // Handle query string
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      path = path.substring(0, queryIndex);
    }

    return path || '/';
  }

  /**
   * Start ping interval for connection health checks
   */
  private startPingInterval(): void {
    this.pingIntervalId = setInterval(() => {
      for (const [connectionId, connection] of this.connections.entries()) {
        const ws = connection.clientSocket as unknown as {
          isAlive: boolean;
        } & WebSocket;

        if (ws.isAlive === false) {
          this.logger.debug(`Connection ${connectionId} timed out`);
          this.closeConnection(connectionId, 1000, 'Ping timeout');
          continue;
        }

        ws.isAlive = false;
        if (connection.clientSocket.readyState === WebSocket.OPEN) {
          connection.clientSocket.ping();
        }
      }
    }, this.config.pingInterval);
  }

  /**
   * Get active connections count
   */
  getConnectionsCount(): number {
    return this.connections.size;
  }

  /**
   * Get connections by service
   */
  getConnectionsByService(serviceName: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.service.name === serviceName
    );
  }

  /**
   * Broadcast message to all connections of a service
   */
  broadcast(serviceName: string, message: string | Buffer): void {
    const connections = this.getConnectionsByService(serviceName);

    for (const connection of connections) {
      if (connection.clientSocket.readyState === WebSocket.OPEN) {
        connection.clientSocket.send(message);
      }
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.closeConnection(connectionId, 1001, 'Server shutting down');
    }

    if (this.wss) {
      this.wss.close();
    }

    this.logger.log('WebSocket proxy shut down');
  }
}
