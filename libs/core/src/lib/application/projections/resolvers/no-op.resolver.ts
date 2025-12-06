/**
 * No-operation Notification Resolver
 *
 * Never sends notifications - use this as default when notifications are not needed.
 * This is the "null object" pattern implementation.
 */

import {
  INotificationResolver,
  NotificationIntent,
} from '../notification-resolver.interface';

export class NoOpNotificationResolver implements INotificationResolver {
  /**
   * Always returns null - no notification will be sent
   */
  resolve(): NotificationIntent | null {
    return null;
  }
}
