/**
 * Owner Notification Resolver
 *
 * Notifies the owner of the aggregate by extracting userId from event data.
 * Looks for ownerId or userId in the event data payload.
 */

import { EventPayload } from '../base-projection';
import {
  INotificationResolver,
  NotificationChannel,
  NotificationSeverity,
  NotificationTarget,
  NotificationType,
} from '../notification-resolver.interface';
import type { NotificationIntent } from '../notification-resolver.interface';

/**
 * Configuration options for OwnerNotificationResolver
 */
export interface OwnerNotificationResolverOptions<TEvent> {
  /** Notification category (e.g., 'trip', 'bid') */
  category: string;
  /** Delivery channels. Defaults to [Sse] */
  channels?: NotificationChannel[];
  /** Message severity. Defaults to Info */
  severity?: NotificationSeverity;
  /** Function to generate notification title from event */
  titleResolver?: (event: TEvent) => string;
  /** Function to generate notification body from event */
  bodyResolver?: (event: TEvent) => string;
}

/**
 * Resolver that notifies the owner of the aggregate
 *
 * @typeParam TEvent - The event payload type
 */
export class OwnerNotificationResolver<
  TEvent extends EventPayload = EventPayload
> implements INotificationResolver<TEvent>
{
  private readonly category: string;
  private readonly channels: NotificationChannel[];
  private readonly severity: NotificationSeverity;
  private readonly titleResolver?: (event: TEvent) => string;
  private readonly bodyResolver?: (event: TEvent) => string;

  /**
   * Create an OwnerNotificationResolver
   *
   * @param options - Configuration options or category string for backward compatibility
   * @param titleResolver - (deprecated) Use options.titleResolver instead
   * @param bodyResolver - (deprecated) Use options.bodyResolver instead
   */
  constructor(
    options: string | OwnerNotificationResolverOptions<TEvent>,
    titleResolver?: (event: TEvent) => string,
    bodyResolver?: (event: TEvent) => string
  ) {
    if (typeof options === 'string') {
      // Backward compatible: constructor(category, titleResolver, bodyResolver)
      this.category = options;
      this.channels = [NotificationChannel.Sse];
      this.severity = NotificationSeverity.Info;
      this.titleResolver = titleResolver;
      this.bodyResolver = bodyResolver;
    } else {
      // New options-based constructor
      this.category = options.category;
      this.channels = options.channels ?? [NotificationChannel.Sse];
      this.severity = options.severity ?? NotificationSeverity.Info;
      this.titleResolver = options.titleResolver;
      this.bodyResolver = options.bodyResolver;
    }
  }

  /**
   * Resolves notification intent by extracting owner/user ID from event data
   */
  resolve(event: TEvent): NotificationIntent | null {
    const data = event.data as Record<string, unknown>;
    const userId = (data['ownerId'] as string) || (data['userId'] as string);

    if (!userId) {
      return null;
    }

    return {
      target: NotificationTarget.User,
      userIds: [userId],
      channels: this.channels,
      payload: {
        type: NotificationType.System,
        category: this.category,
        severity: this.severity,
        title: this.titleResolver?.(event),
        body: this.bodyResolver?.(event),
        data: {
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.type,
          version: event.version,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
