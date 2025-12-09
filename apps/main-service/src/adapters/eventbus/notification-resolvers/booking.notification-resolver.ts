import { Injectable } from '@nestjs/common';
import {
  INotificationResolver,
  NotificationIntent,
  NotificationTarget,
  NotificationChannel,
  NotificationType,
  NotificationCategory,
  NotificationSeverity,
  EventPayload,
} from '@flexobo/core';
import {
  BOOKING_EVENT_TYPES,
  BookingCreatedEventData,
  BookingStatusChangedEventData,
} from '../../../domain/events/booking.events';

type BookingEventPayload = EventPayload<
  | BookingCreatedEventData
  | BookingStatusChangedEventData
  | Record<string, unknown>
>;

export const BOOKING_NOTIFICATION_RESOLVER = Symbol('BOOKING_NOTIFICATION_RESOLVER');

@Injectable()
export class BookingNotificationResolver
  implements INotificationResolver<BookingEventPayload>
{
  resolve(event: BookingEventPayload): NotificationIntent | null {
    switch (event.type) {
      case BOOKING_EVENT_TYPES.CREATED:
        return this.onBookingCreated(event as EventPayload<BookingCreatedEventData>);
      case BOOKING_EVENT_TYPES.STATUS_CHANGED:
        return this.onBookingStatusChanged(event as EventPayload<BookingStatusChangedEventData>);
      case BOOKING_EVENT_TYPES.CUSTOMER_RATED:
      case BOOKING_EVENT_TYPES.OWNER_RATED:
        return this.onRatingAdded(event);
      default:
        return null;
    }
  }

  private onBookingCreated(
    event: EventPayload<BookingCreatedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.customerId, data.ownerId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Booking,
        severity: NotificationSeverity.Success,
        title: 'Booking Confirmed',
        body: `Booking confirmed for ${data.finalPrice} ${data.currency}`,
        data: {
          bookingId: event.aggregateId,
          postId: data.postId,
          postType: data.postType,
          bidId: data.bidId,
          finalPrice: data.finalPrice,
          currency: data.currency,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onBookingStatusChanged(
    event: EventPayload<BookingStatusChangedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Booking,
        severity: NotificationSeverity.Info,
        title: 'Booking Status Updated',
        body: `Booking status changed to ${data.newStatus}`,
        data: {
          bookingId: event.aggregateId,
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
          changedBy: data.changedBy,
          reason: data.reason,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onRatingAdded(event: BookingEventPayload): NotificationIntent {
    const isCustomerRating = event.type === BOOKING_EVENT_TYPES.CUSTOMER_RATED;
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Booking,
        severity: NotificationSeverity.Info,
        title: 'New Rating Received',
        body: isCustomerRating
          ? 'You received a rating from the customer'
          : 'You received a rating from the owner',
        data: {
          bookingId: event.aggregateId,
          ratingType: isCustomerRating ? 'customer' : 'owner',
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
