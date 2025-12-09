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
  BID_EVENT_TYPES,
  BidCreatedEventData,
  BidCounteredEventData,
  BidAcceptedEventData,
  BidRejectedEventData,
} from '../../../domain/events/bid.events';

type BidEventPayload = EventPayload<
  | BidCreatedEventData
  | BidCounteredEventData
  | BidAcceptedEventData
  | BidRejectedEventData
  | Record<string, unknown>
>;

export const BID_NOTIFICATION_RESOLVER = Symbol('BID_NOTIFICATION_RESOLVER');

@Injectable()
export class BidNotificationResolver
  implements INotificationResolver<BidEventPayload>
{
  resolve(event: BidEventPayload): NotificationIntent | null {
    switch (event.type) {
      case BID_EVENT_TYPES.CREATED:
        return this.onBidCreated(event as EventPayload<BidCreatedEventData>);
      case BID_EVENT_TYPES.COUNTERED:
        return this.onBidCountered(event as EventPayload<BidCounteredEventData>);
      case BID_EVENT_TYPES.ACCEPTED:
        return this.onBidAccepted(event as EventPayload<BidAcceptedEventData>);
      case BID_EVENT_TYPES.REJECTED:
        return this.onBidRejected(event as EventPayload<BidRejectedEventData>);
      default:
        return null;
    }
  }

  private onBidCreated(
    event: EventPayload<BidCreatedEventData>
  ): NotificationIntent {
    // Notify the post owner about the new bid
    return {
      target: NotificationTarget.User,
      userIds: [event.data.ownerId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Bid,
        severity: NotificationSeverity.Info,
        title: 'New Bid Received',
        body: `You have received a new bid for ${event.data.proposedPrice} ${event.data.currency}`,
        data: {
          bidId: event.aggregateId,
          postId: event.data.postId,
          postType: event.data.postType,
          bidderId: event.data.bidderId,
          proposedPrice: event.data.proposedPrice,
          currency: event.data.currency,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onBidCountered(
    event: EventPayload<BidCounteredEventData>
  ): NotificationIntent {
    // System notification - UI will determine recipients based on bid context
    return {
      target: NotificationTarget.User,
      userIds: [], // Empty - determined by bid context (bidder/owner)
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Bid,
        severity: NotificationSeverity.Info,
        title: 'Counter Offer',
        body: `Counter offer: ${event.data.newPrice} ${event.data.currency}`,
        data: {
          bidId: event.aggregateId,
          newPrice: event.data.newPrice,
          currency: event.data.currency,
          negotiationRound: event.data.negotiationRound,
          counteredBy: event.data.userId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onBidAccepted(
    event: EventPayload<BidAcceptedEventData>
  ): NotificationIntent {
    // System notification about bid acceptance
    return {
      target: NotificationTarget.User,
      userIds: [], // Determined by bid context
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Bid,
        severity: NotificationSeverity.Success,
        title: 'Bid Accepted',
        body: `Bid accepted for ${event.data.finalPrice} ${event.data.currency}`,
        data: {
          bidId: event.aggregateId,
          finalPrice: event.data.finalPrice,
          currency: event.data.currency,
          acceptedBy: event.data.userId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onBidRejected(
    event: EventPayload<BidRejectedEventData>
  ): NotificationIntent {
    // System notification about bid rejection
    return {
      target: NotificationTarget.User,
      userIds: [], // Determined by bid context
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Bid,
        severity: NotificationSeverity.Warning,
        title: 'Bid Rejected',
        body: event.data.reason || 'The bid has been rejected.',
        data: {
          bidId: event.aggregateId,
          rejectedBy: event.data.userId,
          reason: event.data.reason,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
