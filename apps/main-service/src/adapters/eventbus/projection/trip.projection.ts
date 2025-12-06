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
  ITripReadRepository,
  TRIP_READ_REPOSITORY,
  TripReadDto,
} from '../../../ports/trip.repository';
import {
  TRIP_EVENT_TYPES,
  TripCreatedEventData,
  TripUpdatedEventData,
  TripStatusChangedEventData,
} from '../../../domain/events/trip.events';
import { TripStatus } from '../../../domain/constants/enums';

type TripEventPayload = EventPayload<
  TripCreatedEventData | TripUpdatedEventData | TripStatusChangedEventData | Record<string, unknown>
>;

@Injectable()
export class TripProjection extends BaseProjection<TripReadDto, TripEventPayload> {
  constructor(
    @Inject(TRIP_READ_REPOSITORY)
    private readonly tripRepo: ITripReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null
  ) {
    super(rabbitMQConsumer, TripProjection.name, eventBuffer);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.trip.projection',
      routingKeys: ['trip.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.tripRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: TripEventPayload): Promise<void> {
    switch (event.type) {
      case TRIP_EVENT_TYPES.CREATED:
        await this.onTripCreated(event as EventPayload<TripCreatedEventData>);
        break;
      case TRIP_EVENT_TYPES.UPDATED:
        await this.onTripUpdated(event as EventPayload<TripUpdatedEventData>);
        break;
      case TRIP_EVENT_TYPES.STATUS_CHANGED:
        await this.onTripStatusChanged(event as EventPayload<TripStatusChangedEventData>);
        break;
      case TRIP_EVENT_TYPES.DELETED:
        await this.onTripDeleted(event);
        break;
      default:
        this.logger.warn(`Unknown trip event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as TripEventPayload;
    await this.applyEvent(payload);
  }

  private async onTripCreated(
    event: EventPayload<TripCreatedEventData>
  ): Promise<void> {
    const existing = await this.tripRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.tripRepo.save({
      id: event.aggregateId,
      ownerId: data.ownerId,
      companyId: data.companyId,
      status: TripStatus.DRAFT,
      transport: data.transport,
      loadingPoints: data.loadingPoints,
      unloadingPoints: data.unloadingPoints,
      price: data.price,
      currency: data.currency,
      paymentTerms: data.paymentTerms,
      boardIds: data.boardIds,
      isPublic: data.isPublic,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onTripUpdated(
    event: EventPayload<TripUpdatedEventData>
  ): Promise<void> {
    const existing = await this.tripRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.tripRepo.save({
      ...existing!,
      ...(data.transport !== undefined && { transport: data.transport }),
      ...(data.loadingPoints !== undefined && { loadingPoints: data.loadingPoints }),
      ...(data.unloadingPoints !== undefined && { unloadingPoints: data.unloadingPoints }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
      ...(data.boardIds !== undefined && { boardIds: data.boardIds }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onTripStatusChanged(
    event: EventPayload<TripStatusChangedEventData>
  ): Promise<void> {
    const existing = await this.tripRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.tripRepo.save({
      ...existing!,
      status: event.data.newStatus,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onTripDeleted(event: TripEventPayload): Promise<void> {
    await this.tripRepo.delete(event.aggregateId);
  }
}
