import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqplib/callback_api';
import {
  IMessageSubscriber,
  MessageHandler,
  SubscribeOptions,
  IncomingMessage,
} from './message-publisher.interface';
import { RabbitMQConfig, DEFAULT_RABBITMQ_CONFIG } from './rabbitmq.config';

/**
 * Configuration for consumer-specific settings
 */
export interface RabbitMQConsumerConfig extends RabbitMQConfig {
  /**
   * Default prefetch count for all consumers
   * Default: 10
   */
  defaultPrefetchCount?: number;

  /**
   * Default retry settings
   */
  retry?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  };
}

/**
 * Subscription info for tracking active subscriptions
 */
interface SubscriptionInfo {
  queue: string;
  consumerTag: string;
  handler: MessageHandler;
  options: SubscribeOptions;
}

/**
 * RabbitMQ implementation of IMessageSubscriber
 * Supports message consumption with acknowledgment, retries, and dead letter handling
 */
@Injectable()
export class RabbitMQConsumer
  implements IMessageSubscriber, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMQConsumer.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private connected = false;
  private isShuttingDown = false;
  private subscriptions: Map<string, SubscriptionInfo> = new Map();

  private readonly defaultPrefetchCount: number;
  private readonly retryConfig: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };

  constructor(private readonly config: RabbitMQConsumerConfig) {
    this.config = { ...DEFAULT_RABBITMQ_CONFIG, ...config };
    this.defaultPrefetchCount = config.defaultPrefetchCount || 10;
    this.retryConfig = {
      maxRetries: config.retry?.maxRetries ?? 3,
      initialDelayMs: config.retry?.initialDelayMs ?? 1000,
      maxDelayMs: config.retry?.maxDelayMs ?? 30000,
      backoffMultiplier: config.retry?.backoffMultiplier ?? 2,
    };
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Initialize connection and channel
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = this.config.url || DEFAULT_RABBITMQ_CONFIG.url!;
      this.logger.log(`Connecting consumer to RabbitMQ: ${this.sanitizeUrl(url)}`);

      amqp.connect(url, (err, connection) => {
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
          if (!this.isShuttingDown) {
            this.scheduleReconnect();
          }
        });

        connection.createChannel((channelErr, channel) => {
          if (channelErr) {
            this.logger.error(
              `Failed to create channel: ${channelErr.message}`
            );
            return reject(channelErr);
          }

          this.channel = channel;

          // Set prefetch count for fair dispatch
          channel.prefetch(this.defaultPrefetchCount);

          channel.on('error', (error) => {
            this.logger.error(`RabbitMQ channel error: ${error.message}`);
          });

          channel.on('close', () => {
            this.logger.warn('RabbitMQ channel closed');
          });

          this.connected = true;
          this.setupInfrastructure()
            .then(() => {
              this.logger.log('Consumer successfully connected to RabbitMQ');
              resolve();
            })
            .catch(reject);
        });
      });
    });
  }

  /**
   * Setup exchanges and dead letter queue
   */
  private async setupInfrastructure(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    const channel = this.channel;

    return new Promise((resolve, reject) => {
      // Setup main events exchange
      channel.assertExchange(
        'flexobo.events',
        'topic',
        { durable: true },
        (err1) => {
          if (err1) return reject(err1);

          // Setup dead letter exchange
          channel.assertExchange(
            'flexobo.dlx',
            'topic',
            { durable: true },
            (err2) => {
              if (err2) return reject(err2);

              // Setup dead letter queue
              channel.assertQueue(
                'flexobo.dead-letter',
                {
                  durable: true,
                  arguments: {
                    'x-message-ttl': 86400000 * 7, // 7 days
                  },
                },
                (err3) => {
                  if (err3) return reject(err3);

                  channel.bindQueue(
                    'flexobo.dead-letter',
                    'flexobo.dlx',
                    '#',
                    {},
                    (err4) => {
                      if (err4) return reject(err4);
                      this.logger.log('RabbitMQ infrastructure configured');
                      resolve();
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }

  /**
   * Subscribe to a queue with a message handler
   */
  async subscribe(
    queue: string,
    handler: MessageHandler,
    options?: SubscribeOptions
  ): Promise<void> {
    if (!this.channel || !this.connected) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    const opts: SubscribeOptions = {
      prefetchCount: this.defaultPrefetchCount,
      noAck: false,
      durable: true,
      deadLetterExchange: 'flexobo.dlx',
      maxRetries: this.retryConfig.maxRetries,
      ...options,
    };

    return new Promise((resolve, reject) => {
      if (!this.channel) {
        return reject(new Error('Channel not available'));
      }

      const channel = this.channel;

      // Assert queue with dead letter configuration
      channel.assertQueue(
        queue,
        {
          durable: opts.durable,
          exclusive: opts.exclusive,
          autoDelete: opts.autoDelete,
          arguments: {
            'x-dead-letter-exchange': opts.deadLetterExchange,
            'x-dead-letter-routing-key': `dlq.${queue}`,
            ...(opts.messageTtl && { 'x-message-ttl': opts.messageTtl }),
          },
        },
        (assertErr) => {
          if (assertErr) return reject(assertErr);

          // Set prefetch for this channel
          if (opts.prefetchCount) {
            channel.prefetch(opts.prefetchCount);
          }

          // Start consuming
          channel.consume(
            queue,
            (msg) => {
              if (!msg) return;

              this.handleMessage(msg, handler, opts, queue);
            },
            { noAck: opts.noAck },
            (consumeErr, ok) => {
              if (consumeErr) return reject(consumeErr);

              this.subscriptions.set(queue, {
                queue,
                consumerTag: ok.consumerTag,
                handler,
                options: opts,
              });

              this.logger.log(
                `Subscribed to queue: ${queue} (tag: ${ok.consumerTag})`
              );
              resolve();
            }
          );
        }
      );
    });
  }

  /**
   * Handle incoming message with retry logic
   */
  private async handleMessage(
    msg: amqp.Message,
    handler: MessageHandler,
    options: SubscribeOptions,
    queue: string
  ): Promise<void> {
    const channel = this.channel;
    if (!channel) return;

    const retryCount = this.getRetryCount(msg);
    const maxRetries = options.maxRetries || this.retryConfig.maxRetries;

    // Track if message was already acknowledged by the handler
    let acknowledged = false;

    try {
      const content = JSON.parse(msg.content.toString());

      const incomingMessage: IncomingMessage = {
        content,
        metadata: {
          correlationId: msg.properties.correlationId,
          messageId: msg.properties.messageId,
          timestamp: msg.properties.timestamp,
          headers: msg.properties.headers as Record<
            string,
            string | number | boolean
          >,
          routingKey: msg.fields.routingKey,
        },
        ack: () => {
          if (!options.noAck && !acknowledged) {
            acknowledged = true;
            channel.ack(msg);
          }
        },
        nack: (requeue = true) => {
          if (!options.noAck && !acknowledged) {
            acknowledged = true;
            channel.nack(msg, false, requeue);
          }
        },
        reject: (requeue = false) => {
          if (!options.noAck && !acknowledged) {
            acknowledged = true;
            channel.reject(msg, requeue);
          }
        },
      };

      await handler(incomingMessage);

      // Message processed successfully, auto-ack if handler didn't already
      if (!options.noAck && !acknowledged) {
        acknowledged = true;
        channel.ack(msg);
      }

      this.logger.debug(
        `Message processed successfully: ${msg.properties.messageId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Error processing message from ${queue}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );

      // Don't retry/reject if already acknowledged
      if (acknowledged) {
        return;
      }

      if (retryCount < maxRetries) {
        // Retry with delay
        const delay = this.calculateBackoff(retryCount);
        this.logger.warn(
          `Retrying message (attempt ${retryCount + 1}/${maxRetries}) after ${delay}ms`
        );

        setTimeout(() => {
          this.republishForRetry(msg, queue, retryCount + 1);
          if (!acknowledged) {
            acknowledged = true;
            channel.ack(msg);
          }
        }, delay);
      } else {
        // Max retries exceeded, send to DLQ
        this.logger.error(
          `Message exceeded max retries (${maxRetries}), sending to DLQ`
        );

        if (!options.noAck && !acknowledged) {
          acknowledged = true;
          // Reject without requeue - goes to DLX
          channel.reject(msg, false);
        }
      }
    }
  }

  /**
   * Get retry count from message headers
   */
  private getRetryCount(msg: amqp.Message): number {
    const headers = msg.properties.headers || {};
    return (headers['x-retry-count'] as number) || 0;
  }

  /**
   * Calculate backoff delay for retry
   */
  private calculateBackoff(retryCount: number): number {
    const delay = Math.min(
      this.retryConfig.initialDelayMs *
        Math.pow(this.retryConfig.backoffMultiplier, retryCount),
      this.retryConfig.maxDelayMs
    );
    return delay;
  }

  /**
   * Republish message for retry with incremented retry count
   */
  private republishForRetry(
    originalMsg: amqp.Message,
    queue: string,
    retryCount: number
  ): void {
    if (!this.channel) return;

    const headers = {
      ...originalMsg.properties.headers,
      'x-retry-count': retryCount,
      'x-original-queue': queue,
      'x-last-retry-at': new Date().toISOString(),
    };

    this.channel.sendToQueue(queue, originalMsg.content, {
      ...originalMsg.properties,
      headers,
    });

    this.logger.debug(`Message republished for retry (attempt ${retryCount})`);
  }

  /**
   * Subscribe to events from exchange with routing pattern
   */
  async subscribeToEvents(
    queueName: string,
    routingPatterns: string[],
    handler: MessageHandler,
    options?: SubscribeOptions
  ): Promise<void> {
    if (!this.channel || !this.connected) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    const opts: SubscribeOptions = {
      durable: true,
      deadLetterExchange: 'flexobo.dlx',
      maxRetries: this.retryConfig.maxRetries,
      ...options,
    };

    return new Promise((resolve, reject) => {
      if (!this.channel) {
        return reject(new Error('Channel not available'));
      }

      const channel = this.channel;

      // Assert the queue
      channel.assertQueue(
        queueName,
        {
          durable: opts.durable,
          arguments: {
            'x-dead-letter-exchange': opts.deadLetterExchange,
            'x-dead-letter-routing-key': `dlq.${queueName}`,
          },
        },
        (assertErr) => {
          if (assertErr) return reject(assertErr);

          // Bind queue to exchange with all routing patterns
          let bindCount = 0;
          const bindErrors: Error[] = [];

          routingPatterns.forEach((pattern) => {
            channel.bindQueue(
              queueName,
              'flexobo.events',
              pattern,
              {},
              (bindErr) => {
                if (bindErr) {
                  bindErrors.push(bindErr);
                } else {
                  this.logger.debug(
                    `Queue ${queueName} bound to pattern: ${pattern}`
                  );
                }

                bindCount++;
                if (bindCount === routingPatterns.length) {
                  if (bindErrors.length > 0) {
                    return reject(bindErrors[0]);
                  }

                  // All bindings done, start consuming
                  this.subscribe(queueName, handler, opts)
                    .then(resolve)
                    .catch(reject);
                }
              }
            );
          });
        }
      );
    });
  }

  /**
   * Unsubscribe from a queue
   */
  async unsubscribe(queue: string): Promise<void> {
    const subscription = this.subscriptions.get(queue);
    if (!subscription) {
      this.logger.warn(`No subscription found for queue: ${queue}`);
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.channel) {
        return reject(new Error('Channel not available'));
      }

      this.channel.cancel(subscription.consumerTag, (err) => {
        if (err) {
          this.logger.error(`Failed to cancel subscription: ${err.message}`);
          return reject(err);
        }

        this.subscriptions.delete(queue);
        this.logger.log(`Unsubscribed from queue: ${queue}`);
        resolve();
      });
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.logger.log('Scheduling reconnection in 5 seconds...');
    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.connect()
          .then(() => {
            // Resubscribe to all queues
            this.resubscribeAll();
          })
          .catch((err) => {
            this.logger.error(`Reconnection failed: ${err.message}`);
            this.scheduleReconnect();
          });
      }
    }, 5000);
  }

  /**
   * Resubscribe to all queues after reconnection
   */
  private async resubscribeAll(): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.values());
    this.subscriptions.clear();

    for (const sub of subscriptions) {
      try {
        await this.subscribe(sub.queue, sub.handler, sub.options);
        this.logger.log(`Resubscribed to queue: ${sub.queue}`);
      } catch (err) {
        this.logger.error(
          `Failed to resubscribe to ${sub.queue}: ${err instanceof Error ? err.message : err}`
        );
      }
    }
  }

  /**
   * Disconnect gracefully
   */
  async disconnect(): Promise<void> {
    this.isShuttingDown = true;

    // Cancel all consumers
    for (const queue of this.subscriptions.keys()) {
      await this.unsubscribe(queue).catch(() => {
        /* ignore */
      });
    }

    return new Promise((resolve) => {
      if (this.channel) {
        this.channel.close(() => {
          this.channel = null;

          if (this.connection) {
            this.connection.close(() => {
              this.connection = null;
              this.connected = false;
              this.logger.log('Consumer disconnected from RabbitMQ');
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
          this.logger.log('Consumer disconnected from RabbitMQ');
          resolve();
        });
      } else {
        resolve();
      }
    });
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

  /**
   * Get consumer status
   */
  getStatus(): {
    connected: boolean;
    subscriptions: string[];
    prefetchCount: number;
  } {
    return {
      connected: this.connected,
      subscriptions: Array.from(this.subscriptions.keys()),
      prefetchCount: this.defaultPrefetchCount,
    };
  }
}
