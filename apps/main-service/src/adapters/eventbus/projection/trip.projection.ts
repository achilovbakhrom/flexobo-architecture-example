import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
} from '@flexobo/core';
import {
  ITripReadRepository,
  TRIP_READ_REPOSITORY,
} from '../../../ports/trip.repository';
import {
  TRIP_EVENT_TYPES,
  TripCreatedEventData,
  TripUpdatedEventData,
  TripStatusChangedEventData,
} from '../../../domain/events/trip.events';
import { TripStatus } from '../../../domain/constants/enums';

interface EventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const QUEUE_NAME = 'main-service.trip.projection';

@Injectable()
export class TripProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TripProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(TRIP_READ_REPOSITORY)
    private readonly tripRepo: ITripReadRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUE_NAME);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn('RabbitMQ is not connected. Skipping trip projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      ['trip.#'],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      { durable: true, maxRetries: 3 }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUE_NAME}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as EventPayload;

    this.logger.debug(
      `[Projection] Trip event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case TRIP_EVENT_TYPES.CREATED:
        await this.onTripCreated(payload);
        break;
      case TRIP_EVENT_TYPES.UPDATED:
        await this.onTripUpdated(payload);
        break;
      case TRIP_EVENT_TYPES.STATUS_CHANGED:
        await this.onTripStatusChanged(payload);
        break;
      case TRIP_EVENT_TYPES.DELETED:
        await this.onTripDeleted(payload);
        break;
      default:
        this.logger.warn(`Unknown trip event type: ${payload.type}`);
    }
  }

  private async onTripCreated(event: EventPayload): Promise<void> {
    const data = event.data as unknown as TripCreatedEventData;

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

  private async onTripUpdated(event: EventPayload): Promise<void> {
    const existing = await this.tripRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as TripUpdatedEventData;

    await this.tripRepo.save({
      ...existing,
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

  private async onTripStatusChanged(event: EventPayload): Promise<void> {
    const existing = await this.tripRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as TripStatusChangedEventData;

    await this.tripRepo.save({
      ...existing,
      status: data.newStatus,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onTripDeleted(event: EventPayload): Promise<void> {
    await this.tripRepo.delete(event.aggregateId);
  }
}
