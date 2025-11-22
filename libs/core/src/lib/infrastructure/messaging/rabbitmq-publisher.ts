import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib/callback_api';
import {
  IMessagePublisher,
  PublishMessage,
  PublishMetadata,
} from './message-publisher.interface';
import { RabbitMQConfig, DEFAULT_RABBITMQ_CONFIG } from './rabbitmq.config';

/**
 * RabbitMQ implementation of IMessagePublisher
 * Supports consistent hashing for event ordering and connection pooling
 */
@Injectable()
export class RabbitMQPublisher implements IMessagePublisher, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private connected = false;
  private isShuttingDown = false;

  constructor(private readonly config: RabbitMQConfig) {
    this.config = { ...DEFAULT_RABBITMQ_CONFIG, ...config };
  }

  /**
   * Initialize connection and channel
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(
        `Connecting to RabbitMQ: ${this.sanitizeUrl(this.config.url)}`
      );

      amqp.connect(this.config.url, (err, connection) => {
        if (err) {
          this.logger.error(`Failed to connect to RabbitMQ: ${err.message}`);
          return reject(err);
        }

        this.connection = connection;

        connection.on('error', (error) => {
          this.logger.error(`RabbitMQ connection error: ${error.message}`);
        });

        connection.on('close', () => {
          this.logger.warn('RabbitMQ connection closed');
          this.connected = false;
        });

        connection.createChannel((channelErr, channel) => {
          if (channelErr) {
            this.logger.error(
              `Failed to create channel: ${channelErr.message}`
            );
            return reject(channelErr);
          }

          this.channel = channel;

          channel.on('error', (error) => {
            this.logger.error(`RabbitMQ channel error: ${error.message}`);
          });

          channel.on('close', () => {
            this.logger.warn('RabbitMQ channel closed');
          });

          this.connected = true;
          this.setupInfrastructure()
            .then(() => {
              this.logger.log('Successfully connected to RabbitMQ');
              resolve();
            })
            .catch(reject);
        });
      });
    });
  }

  /**
   * Setup exchanges and queues
   */
  private async setupInfrastructure(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const channel = this.channel;

    return new Promise((resolve, reject) => {
      // Setup dead letter exchange and queue
      if (this.config.deadLetter) {
        const dlx = this.config.deadLetter.exchange || 'dlx';
        const dlq = this.config.deadLetter.queue || 'dlq';

        channel.assertExchange(dlx, 'topic', { durable: true }, (err1) => {
          if (err1) return reject(err1);

          channel.assertQueue(
            dlq,
            {
              durable: true,
              arguments: {
                'x-message-ttl': this.config.deadLetter?.ttl || 86400000,
              },
            },
            (err2) => {
              if (err2) return reject(err2);

              channel.bindQueue(dlq, dlx, '#', {}, (err3) => {
                if (err3) return reject(err3);
                this.logger.log('Dead letter queue configured');
                resolve();
              });
            }
          );
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Publish a single message
   */
  async publish(
    topic: string,
    message: unknown,
    metadata?: PublishMetadata
  ): Promise<string> {
    if (!this.channel || !this.connected) {
      throw new Error('Publisher not connected. Call connect() first.');
    }

    const messageId = metadata?.messageId || this.generateMessageId();
    const headers: Record<string, unknown> = { ...metadata?.headers };

    // Add consistent hashing header if enabled
    if (this.config.consistentHashing?.enabled && metadata?.aggregateId) {
      const hashHeader =
        this.config.consistentHashing.hashHeader || 'x-hash-key';
      headers[hashHeader] = metadata.aggregateId;
    }

    // Add multi-tenancy header
    if (metadata?.companyId) {
      headers['x-company-id'] = metadata.companyId;
    }

    const options: amqp.Options.Publish = {
      persistent:
        metadata?.persistent ??
        this.config.defaultPublishOptions?.persistent ??
        true,
      contentType:
        metadata?.contentType ||
        this.config.defaultPublishOptions?.contentType ||
        'application/json',
      contentEncoding: metadata?.contentEncoding || 'utf-8',
      messageId,
      correlationId: metadata?.correlationId,
      timestamp: metadata?.timestamp || Date.now(),
      priority:
        metadata?.priority ?? this.config.defaultPublishOptions?.priority ?? 0,
      expiration: metadata?.expiration?.toString(),
      headers,
    };

    const routingKey = metadata?.routingKey || '';
    const buffer = Buffer.from(JSON.stringify(message));

    if (!this.channel) {
      throw new Error('Channel not available');
    }

    try {
      const published = this.channel.publish(
        topic,
        routingKey,
        buffer,
        options
      );

      if (!published) {
        throw new Error('Failed to publish message - buffer full');
      }

      if (
        this.config.logging?.enabled &&
        this.config.logging.level === 'debug'
      ) {
        this.logger.debug(
          `Published message ${messageId} to ${topic}/${routingKey}`
        );
      }

      return messageId;
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error}`);
      throw error;
    }
  }

  /**
   * Publish multiple messages in batch
   */
  async publishBatch(messages: PublishMessage[]): Promise<string[]> {
    const messageIds: string[] = [];

    for (const msg of messages) {
      const messageId = await this.publish(
        msg.topic,
        msg.message,
        msg.metadata
      );
      messageIds.push(messageId);
    }

    return messageIds;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect gracefully
   */
  async disconnect(): Promise<void> {
    this.isShuttingDown = true;

    return new Promise((resolve) => {
      if (this.channel) {
        this.channel.close(() => {
          this.channel = null;

          if (this.connection) {
            this.connection.close(() => {
              this.connection = null;
              this.connected = false;
              this.logger.log('Disconnected from RabbitMQ');
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else if (this.connection) {
        this.connection.close(() => {
          this.connection = null;
          this.connected = false;
          this.logger.log('Disconnected from RabbitMQ');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Module destroy hook
   */
  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize URL for logging (hide credentials)
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '***';
      }
      return parsed.toString();
    } catch {
      return '[invalid url]';
    }
  }
}
