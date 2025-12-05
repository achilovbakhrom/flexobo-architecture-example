import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ISSEManager, SSEPayload, SSE_MANAGER } from '../../ports/sse-service.port';
import { RabbitMQConsumer, MESSAGE_PUBLISHER, IMessagePublisher } from '@flexobo/core';

@Injectable()
export class SSEManagerService implements ISSEManager, OnModuleInit {
  private readonly logger = new Logger(SSEManagerService.name);
  private readonly instanceId = uuidv4();
  private readonly connections = new Map<string, Set<Response>>();

  constructor(
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn('RabbitMQ not connected, SSE broadcast via RabbitMQ disabled');
      return;
    }

    const queueName = `notification.sse.${this.instanceId}`;

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
      { durable: false, exclusive: true, autoDelete: true }
    );

    this.logger.log(`SSE Manager initialized with instance ID: ${this.instanceId}`);
  }

  addConnection(userId: string, response: Response): void {
    let userConnections = this.connections.get(userId);

    if (!userConnections) {
      userConnections = new Set();
      this.connections.set(userId, userConnections);
    }

    userConnections.add(response);
    this.logger.debug(
      `Added connection for user ${userId}. Total connections: ${this.getConnectedUserCount()}`
    );
  }

  removeConnection(userId: string, response: Response): void {
    const userConnections = this.connections.get(userId);

    if (userConnections) {
      userConnections.delete(response);

      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }

    this.logger.debug(
      `Removed connection for user ${userId}. Total connections: ${this.getConnectedUserCount()}`
    );
  }

  async sendToUser(userId: string, payload: SSEPayload): Promise<void> {
    await this.messagePublisher.publish('flexobo.events', payload, {
      routingKey: `sse.user.${userId}`,
    });
  }

  async sendToUsers(userIds: string[], payload: SSEPayload): Promise<void> {
    await Promise.all(userIds.map((userId) => this.sendToUser(userId, payload)));
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
    const userConnections = this.connections.get(userId);

    if (!userConnections || userConnections.size === 0) {
      return;
    }

    const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const response of userConnections) {
      try {
        response.write(data);
      } catch (error) {
        this.logger.error(`Error sending SSE to user ${userId}: ${error}`);
        userConnections.delete(response);
      }
    }
  }

  private broadcastLocal(payload: SSEPayload): void {
    const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const [userId, userConnections] of this.connections) {
      for (const response of userConnections) {
        try {
          response.write(data);
        } catch (error) {
          this.logger.error(`Error broadcasting SSE to user ${userId}: ${error}`);
          userConnections.delete(response);
        }
      }
    }
  }
}
