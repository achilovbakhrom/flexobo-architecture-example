import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  MESSAGE_PUBLISHER,
  IMessagePublisher,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
  INotificationResolver,
} from '@flexobo/core';
import {
  IBookingReadRepository,
  BOOKING_READ_REPOSITORY,
  BookingReadDto,
} from '../../../ports/booking.repository';
import {
  BOOKING_EVENT_TYPES,
  BookingCreatedEventData,
  BookingStatusChangedEventData,
  CustomerRatedEventData,
  OwnerRatedEventData,
} from '../../../domain/events/booking.events';
import { BookingStatus } from '../../../domain/constants/enums';
import { BOOKING_NOTIFICATION_RESOLVER } from '../notification-resolvers';

type BookingEventPayload = EventPayload<
  | BookingCreatedEventData
  | BookingStatusChangedEventData
  | CustomerRatedEventData
  | OwnerRatedEventData
  | Record<string, unknown>
>;

@Injectable()
export class BookingProjection extends BaseProjection<
  BookingReadDto,
  BookingEventPayload
> {
  constructor(
    @Inject(BOOKING_READ_REPOSITORY)
    private readonly bookingRepo: IBookingReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null,
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    messagePublisher: IMessagePublisher | null,
    @Optional()
    @Inject(BOOKING_NOTIFICATION_RESOLVER)
    notificationResolver: INotificationResolver<BookingEventPayload> | null
  ) {
    super(rabbitMQConsumer, BookingProjection.name, eventBuffer, messagePublisher, notificationResolver);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.booking.projection',
      routingKeys: ['booking.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.bookingRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(
    event: BookingEventPayload
  ): Promise<void> {
    switch (event.type) {
      case BOOKING_EVENT_TYPES.CREATED:
        await this.onBookingCreated(event as EventPayload<BookingCreatedEventData>);
        break;
      case BOOKING_EVENT_TYPES.STATUS_CHANGED:
        await this.onBookingStatusChanged(
          event as EventPayload<BookingStatusChangedEventData>
        );
        break;
      case BOOKING_EVENT_TYPES.CUSTOMER_RATED:
        await this.onCustomerRated(event as EventPayload<CustomerRatedEventData>);
        break;
      case BOOKING_EVENT_TYPES.OWNER_RATED:
        await this.onOwnerRated(event as EventPayload<OwnerRatedEventData>);
        break;
      default:
        this.logger.warn(`Unknown booking event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as BookingEventPayload;
    await this.applyEvent(payload);
  }

  private async onBookingCreated(
    event: EventPayload<BookingCreatedEventData>
  ): Promise<void> {
    const existing = await this.bookingRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
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

  private async onBookingStatusChanged(
    event: EventPayload<BookingStatusChangedEventData>
  ): Promise<void> {
    const existing = await this.bookingRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const completedAt =
      event.data.newStatus === 'COMPLETED'
        ? new Date(event.occurredAt)
        : existing!.completedAt;

    await this.bookingRepo.save({
      ...existing!,
      status: event.data.newStatus,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
      completedAt,
    });
  }

  private async onCustomerRated(
    event: EventPayload<CustomerRatedEventData>
  ): Promise<void> {
    const existing = await this.bookingRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.bookingRepo.save({
      ...existing!,
      customerRating: event.data.rating,
      customerComment: event.data.comment,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onOwnerRated(
    event: EventPayload<OwnerRatedEventData>
  ): Promise<void> {
    const existing = await this.bookingRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.bookingRepo.save({
      ...existing!,
      ownerRating: event.data.rating,
      ownerComment: event.data.comment,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }
}
