import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  EventVersionMismatchException,
  EventAlreadyAppliedException,
} from '../../domain/exceptions';
import {
  RabbitMQConsumer,
  IncomingMessage,
  IMessagePublisher,
} from '../../infrastructure/messaging';
import { IEventBuffer } from '../../infrastructure/event-buffer/event-buffer.interface';
import {
  INotificationResolver,
  NotificationTarget,
} from './notification-resolver.interface';
import type { NotificationIntent } from './notification-resolver.interface';

/**
 * Projection completion notification payload
 * Published to notification-service for real-time frontend updates
 */
export interface ProjectionCompletedPayload {
  type: 'SYSTEM';
  category: 'PROJECTION';
  userId: string;
  correlationId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
}

/**
 * Base interface for versioned read models
 */
export interface VersionedReadModel {
  id: string;
  version: number;
}

/**
 * Base interface for event payloads with generic data type
 * @typeParam TData - The type of the event data payload
 */
export interface EventPayload<TData = Record<string, unknown>> {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: TData;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for a projection subscription
 */
export interface ProjectionConfig {
  queueName: string;
  routingKeys: string[];
  durable?: boolean;
  maxRetries?: number;
  prefetchCount?: number;
  lockTtlMs?: number;
}

/**
 * Repository interface for projections
 */
export interface IProjectionRepository<T extends VersionedReadModel> {
  findById(id: string): Promise<T | null>;
}

/**
 * Abstract base class for event-sourced projections with version checking.
 * Provides common functionality for:
 * - RabbitMQ subscription management
 * - Version-based idempotency checking
 * - Out-of-order event detection
 * - Optional Redis-based event buffering for guaranteed ordering
 *
 * @typeParam TReadModel - The read model type (must have id and version)
 * @typeParam TEventPayload - The event payload type with typed data field
 */
export abstract class BaseProjection<
  TReadModel extends VersionedReadModel,
  TEventPayload extends EventPayload<unknown> = EventPayload
> implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;
  protected isSubscribed = false;

  constructor(
    protected readonly rabbitMQConsumer: RabbitMQConsumer,
    loggerContext: string,
    protected readonly eventBuffer?: IEventBuffer | null,
    protected readonly messagePublisher?: IMessagePublisher | null,
    /**
     * Optional notification resolver for sending SSE notifications after projection updates.
     * When provided, the resolver determines who to notify and with what content.
     */
    protected readonly notificationResolver?: INotificationResolver<TEventPayload> | null
  ) {
    this.logger = new Logger(loggerContext);
  }

  async onModuleInit(): Promise<void> {
    await this.subscribe();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(this.getConfig().queueName);
    }
  }

  /**
   * Get the projection configuration
   */
  protected abstract getConfig(): ProjectionConfig;

  /**
   * Handle an event. Subclasses implement this to dispatch events to handlers.
   */
  protected abstract handleEvent(message: IncomingMessage): Promise<void>;

  /**
   * Get the current version of a read model from the database.
   * Override this method when using event buffering.
   */
  protected async getCurrentModelVersion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _aggregateId: string
  ): Promise<number> {
    // Default implementation - subclasses should override when using buffering
    return 0;
  }

  /**
   * Apply an event to the read model.
   * Override this method when using event buffering.
   * This is called directly by the buffer draining logic.
   */
  protected async applyEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: TEventPayload
  ): Promise<void> {
    // Default implementation - subclasses should override when using buffering
    throw new Error(
      'applyEvent must be implemented when using event buffering'
    );
  }

  /**
   * Subscribe to RabbitMQ queue
   */
  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn(
        'RabbitMQ is not connected. Skipping projection subscription.'
      );
      return;
    }

    const config = this.getConfig();

    await this.rabbitMQConsumer.subscribeToEvents(
      config.queueName,
      config.routingKeys,
      async (message: IncomingMessage) => {
        if (this.eventBuffer) {
          await this.handleMessageWithBuffer(message);
        } else {
          await this.handleEvent(message);
        }
      },
      {
        durable: config.durable ?? true,
        maxRetries: config.maxRetries ?? 3,
        prefetchCount: config.prefetchCount ?? 10,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${config.queueName}`);
  }

  /**
   * Handle incoming message with buffering support.
   * This method:
   * 1. Acquires a distributed lock for the aggregate
   * 2. Checks if the event is in sequence
   * 3. If out of order, buffers it
   * 4. If in order, processes it and drains the buffer
   */
  private async handleMessageWithBuffer(
    message: IncomingMessage
  ): Promise<void> {
    const event = message.content as TEventPayload;
    const aggregateId = event.aggregateId;
    const eventVersion = event.version;

    const config = this.getConfig();
    const lockTtl = config.lockTtlMs ?? 5000;

    // Try to acquire lock for this aggregate
    const lockAcquired = await this.eventBuffer?.acquireLock(
      aggregateId,
      lockTtl
    );

    if (!lockAcquired) {
      // Another instance is processing this aggregate
      // Buffer the event and return - it will be picked up later
      await this.eventBuffer?.bufferEvent(aggregateId, event);
      this.logger.debug(
        `Lock not acquired for ${aggregateId}, buffered v${eventVersion}`
      );
      return;
    }

    try {
      // Get current version from database (source of truth)
      const currentVersion = await this.getCurrentModelVersion(aggregateId);
      const expectedVersion = currentVersion + 1;

      if (eventVersion < expectedVersion) {
        // Already applied - idempotent skip
        throw new EventAlreadyAppliedException(
          aggregateId,
          eventVersion,
          currentVersion
        );
      }

      if (eventVersion > expectedVersion) {
        // Event arrived out of order - buffer it
        await this.eventBuffer?.bufferEvent(aggregateId, event);
        this.logger.debug(
          `Out of order event v${eventVersion} for ${aggregateId} (expected v${expectedVersion}), buffered`
        );

        // Try to process any buffered events that are now in sequence
        await this.drainBuffer(aggregateId, expectedVersion);
        return;
      }

      // This is the expected version - process it
      await this.applyEvent(event);
      this.logger.debug(`Applied event v${eventVersion} for ${aggregateId}`);

      // Send notification if resolver is configured
      await this.sendNotification(event);

      // After processing, try to drain the buffer
      await this.drainBuffer(aggregateId, eventVersion + 1);
    } finally {
      // Always release lock
      await this.eventBuffer?.releaseLock(aggregateId);
    }
  }

  /**
   * Drain the buffer - process events in sequence from the buffer.
   * This is the "while loop" that processes consecutive events.
   */
  private async drainBuffer(
    aggregateId: string,
    startVersion: number
  ): Promise<void> {
    let nextVersion = startVersion;
    let processedCount = 0;

    while (true) {
      // Check if next event is in buffer
      const bufferedEvent = await this.eventBuffer?.getNextEvent(
        aggregateId,
        nextVersion
      );

      if (!bufferedEvent) {
        // No more consecutive events in buffer
        break;
      }

      // Process the buffered event
      try {
        const eventToApply = bufferedEvent as TEventPayload;
        await this.applyEvent(eventToApply);
        this.logger.debug(
          `Applied buffered event v${nextVersion} for ${aggregateId}`
        );

        // Send notification if resolver is configured
        await this.sendNotification(eventToApply);

        // Remove from buffer after successful processing
        await this.eventBuffer?.removeEvent(aggregateId, nextVersion);
        processedCount++;
        nextVersion++;
      } catch (error) {
        if (error instanceof EventAlreadyAppliedException) {
          // Already applied - remove from buffer and continue
          await this.eventBuffer?.removeEvent(aggregateId, nextVersion);
          nextVersion++;
          continue;
        }
        // Other error - stop processing and let it retry
        this.logger.error(
          `Error processing buffered event v${nextVersion} for ${aggregateId}: ${error}`
        );
        break;
      }
    }

    if (processedCount > 0) {
      this.logger.debug(
        `Drained ${processedCount} events from buffer for ${aggregateId}`
      );
    }
  }

  /**
   * Check version for non-create events.
   * Throws EventAlreadyAppliedException for idempotency (already applied).
   * Throws EventVersionMismatchException for out-of-order events (retry needed).
   *
   * @param entity The current read model entity (or null if not found)
   * @param event The event being processed
   * @returns The entity if version check passes
   */
  protected checkVersion(
    entity: TReadModel | null,
    event: TEventPayload
  ): TReadModel {
    // For non-create events, entity must exist
    if (!entity) {
      // Entity doesn't exist yet - might be out of order, retry
      throw new EventVersionMismatchException(
        event.aggregateId,
        0, // expected
        -1, // actual (doesn't exist)
        event.version
      );
    }

    const expectedVersion = event.version - 1;

    // Already applied - idempotent skip
    if (entity.version >= event.version) {
      throw new EventAlreadyAppliedException(
        event.aggregateId,
        event.version,
        entity.version
      );
    }

    // Version gap - events arrived out of order
    if (entity.version !== expectedVersion) {
      throw new EventVersionMismatchException(
        event.aggregateId,
        expectedVersion,
        entity.version,
        event.version
      );
    }

    return entity;
  }

  /**
   * Check version for create events (idempotency only).
   * Use this in onCreate handlers to ensure idempotency.
   *
   * @param existingEntity The existing entity if found
   * @param event The create event being processed
   * @throws EventAlreadyAppliedException if already created with same or higher version
   */
  protected checkCreateIdempotency(
    existingEntity: TReadModel | null,
    event: TEventPayload
  ): void {
    if (existingEntity && existingEntity.version >= event.version) {
      throw new EventAlreadyAppliedException(
        event.aggregateId,
        event.version,
        existingEntity.version
      );
    }
  }

  /**
   * Extract the user ID from the event for notification purposes.
   * Override this method to enable projection completion notifications.
   * Return null to skip notification for specific events.
   *
   * @param event The event being processed
   * @returns The user ID to notify, or null to skip notification
   */
  protected getUserIdFromEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _event: TEventPayload
  ): string | null {
    // Default implementation - subclasses should override to enable notifications
    return null;
  }

  /**
   * Notify the notification-service that a projection has completed.
   * This allows the frontend to receive real-time SSE updates when data is ready.
   *
   * Call this method after successfully applying an event in your projection.
   *
   * @param event The event that was applied
   */
  protected async notifyProjectionCompleted(event: TEventPayload): Promise<void> {
    if (!this.messagePublisher) {
      return;
    }

    const userId = this.getUserIdFromEvent(event);
    if (!userId) {
      return;
    }

    const correlationId = event.metadata?.['correlationId'] as string | undefined;

    const payload: ProjectionCompletedPayload = {
      type: 'SYSTEM',
      category: 'PROJECTION',
      userId,
      correlationId,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.type,
      version: event.version,
    };

    try {
      await this.messagePublisher.publish('flexobo.events', payload, {
        routingKey: `projection.completed.${event.aggregateType.toLowerCase()}`,
        correlationId,
      });
      this.logger.debug(
        `Published projection.completed for ${event.aggregateType}:${event.aggregateId} v${event.version}`
      );
    } catch (error) {
      // Log but don't fail the projection - notification is best-effort
      this.logger.warn(
        `Failed to publish projection.completed for ${event.aggregateType}:${event.aggregateId}: ${error}`
      );
    }
  }

  /**
   * Send notification based on resolver's decision.
   * This method uses the Strategy pattern - the resolver determines who to notify
   * and with what content.
   *
   * Call this method after successfully applying an event in your projection,
   * or it will be called automatically when using event buffering.
   *
   * @param event The event that was applied
   */
  protected async sendNotification(event: TEventPayload): Promise<void> {
    if (!this.messagePublisher || !this.notificationResolver) {
      return;
    }

    const intent: NotificationIntent | null =
      this.notificationResolver.resolve(event);

    if (!intent || intent.target === NotificationTarget.None) {
      return;
    }

    const routingKey =
      intent.target === NotificationTarget.Broadcast
        ? 'notification.broadcast'
        : `notification.user.${intent.userIds?.join(',')}`;

    try {
      await this.messagePublisher.publish(
        'flexobo.events',
        {
          target: intent.target,
          userIds: intent.userIds,
          channels: intent.channels ?? ['sse'], // Default to SSE if not specified
          ...intent.payload,
        },
        {
          routingKey,
          correlationId: intent.correlationId,
        }
      );

      this.logger.debug(
        `Published notification for ${event.aggregateType}:${event.aggregateId} to ${intent.target === NotificationTarget.Broadcast ? 'broadcast' : intent.userIds?.length + ' users'}`
      );
    } catch (error) {
      // Log but don't fail the projection - notification is best-effort
      this.logger.warn(
        `Failed to publish notification for ${event.aggregateType}:${event.aggregateId}: ${error}`
      );
    }
  }
}
