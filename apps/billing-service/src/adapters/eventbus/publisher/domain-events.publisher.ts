import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma.module';

@Injectable()
export class DomainEventsPublisher implements OnModuleInit {
  private readonly logger = new Logger(DomainEventsPublisher.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('RABBITMQ_CLIENT') private readonly rabbitClient: ClientProxy,
  ) {}

  async onModuleInit() {
    this.logger.log('DomainEventsPublisher initialized');
    // Process any pending outbox messages on startup
    await this.processOutbox();
  }

  /**
   * Publish a domain event both locally (for projections) and to RabbitMQ
   */
  async publishEvent(
    event: {
      eventType: string;
      aggregateId: string;
      data: unknown;
      version: number;
    },
    routingKey: string,
  ): Promise<void> {
    // Emit locally for projections
    const eventName = this.eventTypeToEventName(event.eventType);
    this.eventEmitter.emit(eventName, {
      aggregateId: event.aggregateId,
      data: event.data,
      version: event.version,
      timestamp: new Date(),
    });

    this.logger.debug(`Emitted local event: ${eventName}`);
  }

  /**
   * Process outbox messages and publish to RabbitMQ
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutbox(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingMessages = await this.prisma.outbox.findMany({
        where: { published: false },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      if (pendingMessages.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${pendingMessages.length} outbox messages`);

      for (const message of pendingMessages) {
        try {
          // Publish to RabbitMQ
          await this.rabbitClient
            .emit(message.routingKey, message.payload)
            .toPromise();

          // Also emit locally for projections
          const payload = message.payload as {
            eventType: string;
            aggregateId: string;
            data: unknown;
            version: number;
          };
          const eventName = this.eventTypeToEventName(payload.eventType);
          this.eventEmitter.emit(eventName, {
            aggregateId: payload.aggregateId,
            data: payload.data,
            version: payload.version,
            timestamp: new Date(),
          });

          // Mark as published
          await this.prisma.outbox.update({
            where: { id: message.id },
            data: {
              published: true,
              publishedAt: new Date(),
            },
          });

          this.logger.debug(`Published event: ${message.routingKey}`);
        } catch (error) {
          this.logger.error(
            `Failed to publish outbox message ${message.id}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing outbox: ${error}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clean up old published outbox messages
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOutbox(): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await this.prisma.outbox.deleteMany({
      where: {
        published: true,
        publishedAt: {
          lt: oneWeekAgo,
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old outbox messages`);
    }
  }

  /**
   * Convert event type to event name for local emission
   * e.g., "PLAN_CREATED" -> "plan.created"
   */
  private eventTypeToEventName(eventType: string): string {
    return eventType.toLowerCase().replace(/_/g, '.');
  }
}
