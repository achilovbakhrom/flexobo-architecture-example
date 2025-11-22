import { Injectable, Logger } from '@nestjs/common';
import {
  IEventBus,
  SagaEvent,
  SagaEventHandler,
} from './choreography.interface';

/**
 * In-memory event bus for choreography (for testing or single-process scenarios)
 * For production, use RabbitMQ-based event bus
 */
@Injectable()
export class InMemoryEventBus implements IEventBus {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private readonly subscriptions = new Map<string, Set<SagaEventHandler>>();

  /**
   * Publish event to all subscribers
   */
  async publish<TPayload = unknown>(event: SagaEvent<TPayload>): Promise<void> {
    const handlers = this.subscriptions.get(event.eventType);

    if (!handlers || handlers.size === 0) {
      this.logger.debug(`No subscribers for event: ${event.eventType}`);
      return;
    }

    this.logger.debug(
      `Publishing event ${event.eventType} to ${handlers.size} subscribers`
    );

    // Execute all handlers (fire and forget for async processing)
    const promises = Array.from(handlers).map((handler) =>
      handler(event).catch((error) => {
        this.logger.error(
          `Handler error for event ${event.eventType}: ${error}`
        );
      })
    );

    await Promise.all(promises);
  }

  /**
   * Subscribe to event type
   */
  async subscribe<TPayload = unknown>(
    eventType: string,
    handler: SagaEventHandler<TPayload>
  ): Promise<void> {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    const handlers = this.subscriptions.get(eventType);
    if (handlers) {
      handlers.add(handler as SagaEventHandler);
    }
    this.logger.debug(`Subscribed to event: ${eventType}`);
  }

  /**
   * Unsubscribe from event type
   */
  async unsubscribe(eventType: string): Promise<void> {
    this.subscriptions.delete(eventType);
    this.logger.debug(`Unsubscribed from event: ${eventType}`);
  }

  /**
   * Get subscriber count for event type (for testing)
   */
  getSubscriberCount(eventType: string): number {
    return this.subscriptions.get(eventType)?.size ?? 0;
  }

  /**
   * Clear all subscriptions (for testing)
   */
  clear(): void {
    this.subscriptions.clear();
  }
}
