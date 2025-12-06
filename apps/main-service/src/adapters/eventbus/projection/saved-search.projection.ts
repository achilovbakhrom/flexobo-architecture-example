import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
} from '@flexobo/core';
import {
  ISavedSearchReadRepository,
  SAVED_SEARCH_READ_REPOSITORY,
  SavedSearchReadDto,
} from '../../../ports/saved-search.repository';
import {
  SAVED_SEARCH_EVENT_TYPES,
  SavedSearchCreatedEventData,
  SavedSearchUpdatedEventData,
  SavedSearchUsedEventData,
} from '../../../domain/events/saved-search.events';

type SavedSearchEventPayload = EventPayload<
  | SavedSearchCreatedEventData
  | SavedSearchUpdatedEventData
  | SavedSearchUsedEventData
  | Record<string, unknown>
>;

@Injectable()
export class SavedSearchProjection extends BaseProjection<
  SavedSearchReadDto,
  SavedSearchEventPayload
> {
  constructor(
    @Inject(SAVED_SEARCH_READ_REPOSITORY)
    private readonly searchRepo: ISavedSearchReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null
  ) {
    super(rabbitMQConsumer, SavedSearchProjection.name, eventBuffer);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.saved-search.projection',
      routingKeys: ['saved_search.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.searchRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: SavedSearchEventPayload): Promise<void> {
    switch (event.type) {
      case SAVED_SEARCH_EVENT_TYPES.CREATED:
        await this.onSearchCreated(event as EventPayload<SavedSearchCreatedEventData>);
        break;
      case SAVED_SEARCH_EVENT_TYPES.UPDATED:
        await this.onSearchUpdated(event as EventPayload<SavedSearchUpdatedEventData>);
        break;
      case SAVED_SEARCH_EVENT_TYPES.USED:
        await this.onSearchUsed(event as EventPayload<SavedSearchUsedEventData>);
        break;
      case SAVED_SEARCH_EVENT_TYPES.DELETED:
        await this.onSearchDeleted(event);
        break;
      default:
        this.logger.warn(`Unknown saved search event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as SavedSearchEventPayload;
    await this.applyEvent(payload);
  }

  private async onSearchCreated(
    event: EventPayload<SavedSearchCreatedEventData>
  ): Promise<void> {
    const existing = await this.searchRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.searchRepo.save({
      id: event.aggregateId,
      userId: data.userId,
      name: data.name,
      searchType: data.searchType,
      filters: data.filters,
      notifyOnNew: data.notifyOnNew,
      isActive: true,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onSearchUpdated(
    event: EventPayload<SavedSearchUpdatedEventData>
  ): Promise<void> {
    const existing = await this.searchRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.searchRepo.save({
      ...existing!,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.filters !== undefined && { filters: data.filters }),
      ...(data.notifyOnNew !== undefined && { notifyOnNew: data.notifyOnNew }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onSearchUsed(
    event: EventPayload<SavedSearchUsedEventData>
  ): Promise<void> {
    const existing = await this.searchRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.searchRepo.save({
      ...existing!,
      lastUsedAt: new Date(event.data.usedAt),
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onSearchDeleted(event: SavedSearchEventPayload): Promise<void> {
    await this.searchRepo.delete(event.aggregateId);
  }
}
