import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib/callback_api';
import {
  IEventBus,
  SagaEvent,
  SagaEventHandler,
} from './choreography.interface';

/**
 * RabbitMQ-based event bus for production choreography
 */
@Injectable()
export class RabbitMQEventBus implements IEventBus, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQEventBus.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly handlers = new Map<string, Set<SagaEventHandler>>();
  private readonly exchangeName = 'saga.choreography';
  private readonly queuePrefix: string;
  private connected = false;

  constructor(
    private readonly rabbitMQUrl: string,
    queuePrefix = 'choreography'
  ) {
    this.queuePrefix = queuePrefix;
  }

  /**
   * Initialize connection
   */
  private async ensureConnection(): Promise<void> {
    if (this.connected && this.connection && this.channel) {
      return;
    }

    return new Promise((resolve, reject) => {
      amqp.connect(this.rabbitMQUrl, (err, connection) => {
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

        // Create channel
        connection.createChannel((err, channel) => {
          if (err) {
            this.logger.error(`Failed to create channel: ${err.message}`);
            return reject(err);
          }

          this.channel = channel;

          // Assert exchange
          channel.assertExchange(
            this.exchangeName,
            'topic',
            { durable: true },
            (err) => {
              if (err) {
                this.logger.error(`Failed to assert exchange: ${err.message}`);
                return reject(err);
              }

              this.connected = true;
              this.logger.log('Connected to RabbitMQ for choreography');
              resolve();
            }
          );
        });
      });
    });
  }

  /**
   * Publish event to exchange
   */
  async publish<TPayload = unknown>(event: SagaEvent<TPayload>): Promise<void> {
    await this.ensureConnection();

    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const routingKey = event.eventType;
    const message = {
      ...event,
      timestamp: event.timestamp.toISOString(),
    };

    const success = this.channel.publish(
      this.exchangeName,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
        headers: {
          'x-saga-id': event.sagaId,
          'x-event-type': event.eventType,
        },
      }
    );

    if (!success) {
      this.logger.warn(
        `Failed to publish event ${event.eventType} (buffer full)`
      );
    } else {
      this.logger.debug(
        `Published event ${event.eventType} with saga ID ${event.sagaId}`
      );
    }
  }

  /**
   * Subscribe to event type
   */
  async subscribe<TPayload = unknown>(
    eventType: string,
    handler: SagaEventHandler<TPayload>
  ): Promise<void> {
    await this.ensureConnection();

    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    // Store handler
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.add(handler as SagaEventHandler);
    }

    // Create queue for this event type
    const queueName = `${this.queuePrefix}.${eventType}`;

    return new Promise((resolve, reject) => {
      if (!this.channel) {
        return reject(new Error('Channel not initialized'));
      }

      this.channel.assertQueue(
        queueName,
        {
          durable: true,
          arguments: {
            'x-message-ttl': 86400000, // 24 hours
          },
        },
        (err) => {
          if (err) {
            return reject(err);
          }

          if (!this.channel) {
            return reject(new Error('Channel not initialized'));
          }

          // Bind queue to exchange
          this.channel.bindQueue(
            queueName,
            this.exchangeName,
            eventType,
            {},
            (err) => {
              if (err) {
                return reject(err);
              }

              if (!this.channel) {
                return reject(new Error('Channel not initialized'));
              }

              // Consume messages
              this.channel.consume(
                queueName,
                async (msg) => {
                  if (!msg) return;

                  try {
                    const content = JSON.parse(msg.content.toString());
                    const event: SagaEvent<TPayload> = {
                      ...content,
                      timestamp: new Date(content.timestamp),
                    };

                    // Execute all handlers for this event type
                    const eventHandlers = this.handlers.get(eventType);
                    if (eventHandlers) {
                      await Promise.all(
                        Array.from(eventHandlers).map((h) =>
                          h(event).catch((error) => {
                            this.logger.error(
                              `Handler error for ${eventType}: ${error}`
                            );
                            throw error;
                          })
                        )
                      );
                    }

                    // Acknowledge message
                    if (this.channel) {
                      this.channel.ack(msg);
                      this.logger.debug(`Processed event ${eventType}`);
                    }
                  } catch (error) {
                    this.logger.error(
                      `Failed to process event ${eventType}:`,
                      error
                    );
                    // Reject and requeue (with limit)
                    const retryCount =
                      (msg.properties.headers?.['x-retry-count'] as number) ??
                      0;
                    if (this.channel) {
                      if (retryCount < 3) {
                        this.channel.nack(msg, false, true);
                      } else {
                        // Dead letter after max retries
                        this.channel.nack(msg, false, false);
                      }
                    }
                  }
                },
                { noAck: false },
                (err) => {
                  if (err) {
                    return reject(err);
                  }

                  this.logger.log(
                    `Subscribed to event: ${eventType} on queue ${queueName}`
                  );
                  resolve();
                }
              );
            }
          );
        }
      );
    });
  }

  /**
   * Unsubscribe from event type
   */
  async unsubscribe(eventType: string): Promise<void> {
    this.handlers.delete(eventType);

    // Note: In production, you might want to keep the queue and just remove handlers
    // or implement a more sophisticated unsubscribe mechanism

    this.logger.debug(`Unsubscribed from event: ${eventType}`);
  }

  /**
   * Module destruction
   */
  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      await new Promise<void>((resolve) => {
        this.channel?.close(() => {
          this.logger.log('RabbitMQ channel closed');
          resolve();
        });
      });
    }
    if (this.connection) {
      await new Promise<void>((resolve) => {
        this.connection?.close(() => {
          this.logger.log('RabbitMQ connection closed');
          resolve();
        });
      });
    }
  }
}
