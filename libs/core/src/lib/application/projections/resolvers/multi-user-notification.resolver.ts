/**
 * Multi-User Notification Resolver
 *
 * Notifies multiple users based on a user ID extractor function.
 * Useful for scenarios like chat rooms where multiple participants need to be notified.
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
 * Configuration options for MultiUserNotificationResolver
 */
export interface MultiUserNotificationResolverOptions<TEvent> {
  /** Notification category (e.g., 'chat', 'bid') */
  category: string;
  /** Function to extract user IDs from event */
  userIdsExtractor: (event: TEvent) => string[];
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
 * Resolver that notifies multiple users extracted from event data
 *
 * @typeParam TEvent - The event payload type
 */
export class MultiUserNotificationResolver<
  TEvent extends EventPayload = EventPayload
> implements INotificationResolver<TEvent>
{
  private readonly category: string;
  private readonly userIdsExtractor: (event: TEvent) => string[];
  private readonly channels: NotificationChannel[];
  private readonly severity: NotificationSeverity;
  private readonly titleResolver?: (event: TEvent) => string;
  private readonly bodyResolver?: (event: TEvent) => string;

  /**
   * Create a MultiUserNotificationResolver
   *
   * @param options - Configuration options or category string for backward compatibility
   * @param userIdsExtractor - (deprecated) Use options.userIdsExtractor instead
   * @param titleResolver - (deprecated) Use options.titleResolver instead
   * @param bodyResolver - (deprecated) Use options.bodyResolver instead
   */
  constructor(
    options: string | MultiUserNotificationResolverOptions<TEvent>,
    userIdsExtractor?: (event: TEvent) => string[],
    titleResolver?: (event: TEvent) => string,
    bodyResolver?: (event: TEvent) => string
  ) {
    if (typeof options === 'string') {
      // Backward compatible: constructor(category, userIdsExtractor, titleResolver, bodyResolver)
      if (!userIdsExtractor) {
        throw new Error('userIdsExtractor is required');
      }
      this.category = options;
      this.userIdsExtractor = userIdsExtractor;
      this.channels = [NotificationChannel.Sse];
      this.severity = NotificationSeverity.Info;
      this.titleResolver = titleResolver;
      this.bodyResolver = bodyResolver;
    } else {
      // New options-based constructor
      this.category = options.category;
      this.userIdsExtractor = options.userIdsExtractor;
      this.channels = options.channels ?? [NotificationChannel.Sse];
      this.severity = options.severity ?? NotificationSeverity.Info;
      this.titleResolver = options.titleResolver;
      this.bodyResolver = options.bodyResolver;
    }
  }

  /**
   * Resolves notification intent by extracting user IDs using the provided extractor
   */
  resolve(event: TEvent): NotificationIntent | null {
    const userIds = this.userIdsExtractor(event);

    if (!userIds || userIds.length === 0) {
      return null;
    }

    return {
      target: NotificationTarget.User,
      userIds,
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
