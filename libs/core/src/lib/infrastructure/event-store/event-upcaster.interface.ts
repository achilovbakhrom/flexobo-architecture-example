/**
 * Event upcaster interface for handling event schema evolution.
 * Upcasters transform events from one version to another, allowing
 * the system to handle breaking changes in event schemas over time.
 *
 * @example
 * ```typescript
 * @EventUpcaster('UserRegistered', 1, 2)
 * class UserRegisteredV1ToV2Upcaster implements IEventUpcaster {
 *   upcast(event: any): any {
 *     return {
 *       ...event,
 *       eventVersion: 2,
 *       data: {
 *         ...event.data,
 *         email: event.data.username, // renamed field
 *         fullName: `${event.data.firstName} ${event.data.lastName}` // combined fields
 *       }
 *     };
 *   }
 * }
 * ```
 */
export interface IEventUpcaster {
  /**
   * The type of event this upcaster handles (e.g., 'UserRegistered')
   */
  readonly eventType: string;

  /**
   * The source version this upcaster expects (e.g., 1)
   */
  readonly fromVersion: number;

  /**
   * The target version this upcaster produces (e.g., 2)
   */
  readonly toVersion: number;

  /**
   * Transform an event from fromVersion to toVersion.
   * This method should be pure and not have side effects.
   *
   * @param event The event to upcast (with eventVersion = fromVersion)
   * @returns The upcasted event (with eventVersion = toVersion)
   */
  upcast(event: any): any;
}

/**
 * Metadata key for storing event upcaster information
 */
export const EVENT_UPCASTER_METADATA = Symbol('EVENT_UPCASTER_METADATA');

/**
 * Event upcaster metadata structure
 */
export interface EventUpcasterMetadata {
  eventType: string;
  fromVersion: number;
  toVersion: number;
}
