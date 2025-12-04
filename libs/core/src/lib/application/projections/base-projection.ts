import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  EventVersionMismatchException,
  EventAlreadyAppliedException,
} from '../../domain/exceptions';
import {
  RabbitMQConsumer,
  IncomingMessage,
} from '../../infrastructure/messaging';

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
    loggerContext: string
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
        await this.handleEvent(message);
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
}
