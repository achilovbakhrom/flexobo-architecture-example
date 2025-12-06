/**
 * Notification Resolver Interface
 *
 * Provides a SOLID-compliant strategy pattern for projections to optionally
 * send notifications after read model updates via various channels (SSE, PUSH, EMAIL, SMS).
 */

import { EventPayload } from './base-projection';

/**
 * Notification target types - who should receive the notification
 */
export enum NotificationTarget {
  /** Send to specific user(s) */
  User = 'user',
  /** Broadcast to all connected users */
  Broadcast = 'broadcast',
  /** Skip notification */
  None = 'none',
}

/**
 * Notification delivery channels
 */
export enum NotificationChannel {
  /** Server-Sent Events for real-time updates */
  Sse = 'sse',
  /** Push notifications (FCM/APNS) */
  Push = 'push',
  /** Email notifications */
  Email = 'email',
  /** SMS notifications */
  Sms = 'sms',
}

/**
 * Notification severity/message type
 */
export enum NotificationSeverity {
  /** Informational message */
  Info = 'info',
  /** Success message */
  Success = 'success',
  /** Warning message */
  Warning = 'warning',
  /** Error message */
  Error = 'error',
}

/**
 * Notification type - system-generated or user-triggered
 */
export enum NotificationType {
  /** System-generated notification (e.g., projection updates) */
  System = 'system',
  /** User-triggered notification */
  User = 'user',
}

/**
 * Notification categories for filtering and grouping
 */
export enum NotificationCategory {
  /** Projection/data update notifications */
  Projection = 'projection',
  /** Subscription-related notifications */
  Subscription = 'subscription',
  /** Order-related notifications */
  Order = 'order',
  /** Payment-related notifications */
  Payment = 'payment',
  /** Chat/messaging notifications */
  Chat = 'chat',
  /** General system notifications */
  System = 'system',
  /** Bid-related notifications */
  Bid = 'bid',
  /** Booking-related notifications */
  Booking = 'booking',
  /** Load/cargo notifications */
  Load = 'load',
  /** Trip/transport notifications */
  Trip = 'trip',
  /** Company notifications */
  Company = 'company',
}

/**
 * Device platform for push notification registration
 */
export enum DevicePlatform {
  Ios = 'ios',
  Android = 'android',
  Web = 'web',
}

/**
 * Notification payload content
 */
export interface NotificationPayload {
  /** Notification type: system or user */
  type: NotificationType;
  /** Notification category for filtering */
  category: string;
  /** Message severity. Defaults to Info if not specified */
  severity?: NotificationSeverity;
  /** Notification title */
  title?: string;
  /** Notification body/message */
  body?: string;
  /** Additional data payload */
  data?: Record<string, unknown>;
}

/**
 * Notification intent returned by resolver
 * Describes who should be notified and with what content
 */
export interface NotificationIntent {
  /** Target type - user(s) or broadcast */
  target: NotificationTarget;
  /** User IDs if target is User (supports single or multiple) */
  userIds?: string[];
  /** Delivery channels. Defaults to [Sse] if not specified */
  channels?: NotificationChannel[];
  /** Notification payload content */
  payload: NotificationPayload;
  /** Correlation ID for request tracing */
  correlationId?: string;
}

/**
 * SSE (Server-Sent Events) payload structure
 */
export interface SsePayload {
  /** Notification type */
  type: string;
  /** Notification category */
  category?: string;
  /** Message severity: info, success, warning, error */
  severity?: string;
  /** Notification title */
  title?: string;
  /** Notification body */
  body?: string;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Unix timestamp in milliseconds */
  timestamp?: number;
}

/**
 * Message published to notification queue
 */
export interface NotificationMessage {
  /** Target type */
  target: NotificationTarget;
  /** User IDs for targeted notifications */
  userIds?: string[];
  /** Delivery channels */
  channels?: NotificationChannel[];
  /** Notification type */
  type: NotificationType;
  /** Notification category */
  category: string;
  /** Message severity */
  severity?: NotificationSeverity;
  /** Notification title */
  title?: string;
  /** Notification body */
  body?: string;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Correlation ID */
  correlationId?: string;
}

/**
 * Interface for resolving notification intent from events
 * Implementations decide who to notify and with what content
 *
 * Following SOLID principles:
 * - Single Responsibility: Each resolver handles one notification strategy
 * - Open/Closed: New resolvers can be added without modifying BaseProjection
 * - Liskov Substitution: All resolvers implement this interface
 * - Interface Segregation: Small, focused interface
 * - Dependency Inversion: BaseProjection depends on this abstraction
 *
 * @typeParam TEvent - The event payload type
 */
export interface INotificationResolver<TEvent = EventPayload> {
  /**
   * Resolve notification intent from an event
   * @param event - The event that was applied
   * @returns NotificationIntent if notification should be sent, null to skip
   */
  resolve(event: TEvent): NotificationIntent | null;
}

/**
 * Injection token for notification resolver
 */
export const NOTIFICATION_RESOLVER = Symbol('NOTIFICATION_RESOLVER');
