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
  IBookingReadRepository,
  BOOKING_READ_REPOSITORY,
} from '../../../ports/booking.repository';
import {
  BOOKING_EVENT_TYPES,
  BookingCreatedEventData,
  BookingStatusChangedEventData,
  CustomerRatedEventData,
  OwnerRatedEventData,
} from '../../../domain/events/booking.events';
import { BookingStatus } from '../../../domain/constants/enums';

interface EventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const QUEUE_NAME = 'main-service.booking.projection';

@Injectable()
export class BookingProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(BOOKING_READ_REPOSITORY)
    private readonly bookingRepo: IBookingReadRepository,
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
      this.logger.warn('RabbitMQ is not connected. Skipping booking projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      ['booking.#'],
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
      `[Projection] Booking event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case BOOKING_EVENT_TYPES.CREATED:
        await this.onBookingCreated(payload);
        break;
      case BOOKING_EVENT_TYPES.STATUS_CHANGED:
        await this.onBookingStatusChanged(payload);
        break;
      case BOOKING_EVENT_TYPES.CUSTOMER_RATED:
        await this.onCustomerRated(payload);
        break;
      case BOOKING_EVENT_TYPES.OWNER_RATED:
        await this.onOwnerRated(payload);
        break;
      default:
        this.logger.warn(`Unknown booking event type: ${payload.type}`);
    }
  }

  private async onBookingCreated(event: EventPayload): Promise<void> {
    const data = event.data as unknown as BookingCreatedEventData;

    await this.bookingRepo.save({
      id: event.aggregateId,
      customerId: data.customerId,
      ownerId: data.ownerId,
      postType: data.postType,
      postId: data.postId,
      bidId: data.bidId,
      finalPrice: data.finalPrice,
      currency: data.currency,
      status: BookingStatus.PENDING,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBookingStatusChanged(event: EventPayload): Promise<void> {
    const existing = await this.bookingRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as BookingStatusChangedEventData;
    const completedAt =
      data.newStatus === 'COMPLETED' ? new Date(event.occurredAt) : existing.completedAt;

    await this.bookingRepo.save({
      ...existing,
      status: data.newStatus,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
      completedAt,
    });
  }

  private async onCustomerRated(event: EventPayload): Promise<void> {
    const existing = await this.bookingRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as CustomerRatedEventData;

    await this.bookingRepo.save({
      ...existing,
      customerRating: data.rating,
      customerComment: data.comment,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onOwnerRated(event: EventPayload): Promise<void> {
    const existing = await this.bookingRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as OwnerRatedEventData;

    await this.bookingRepo.save({
      ...existing,
      ownerRating: data.rating,
      ownerComment: data.comment,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }
}
