import 'reflect-metadata';
import {
  EVENT_UPCASTER_METADATA,
  EventUpcasterMetadata,
} from './event-upcaster.interface';

/**
 * Decorator to mark a class as an event upcaster.
 * The decorated class must implement IEventUpcaster.
 *
 * @param eventType The type of event this upcaster handles
 * @param fromVersion The source version this upcaster expects
 * @param toVersion The target version this upcaster produces
 *
 * @example
 * ```typescript
 * @EventUpcaster('UserRegistered', 1, 2)
 * export class UserRegisteredV1ToV2Upcaster implements IEventUpcaster {
 *   eventType = 'UserRegistered';
 *   fromVersion = 1;
 *   toVersion = 2;
 *
 *   upcast(event: any): any {
 *     return {
 *       ...event,
 *       eventVersion: 2,
 *       data: {
 *         ...event.data,
 *         email: event.data.username
 *       }
 *     };
 *   }
 * }
 * ```
 */
export function EventUpcaster(
  eventType: string,
  fromVersion: number,
  toVersion: number
): ClassDecorator {
  return (target: any) => {
    const metadata: EventUpcasterMetadata = {
      eventType,
      fromVersion,
      toVersion,
    };
    Reflect.defineMetadata(EVENT_UPCASTER_METADATA, metadata, target);
  };
}
