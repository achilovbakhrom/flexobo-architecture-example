/**
 * Example event upcasters demonstrating how to handle event schema evolution.
 *
 * This file shows a realistic example of evolving a UserRegistered event
 * through multiple versions:
 *
 * V1: Basic user with username, firstName, lastName
 * V2: Combined firstName/lastName into fullName, renamed username to email
 * V3: Added emailVerified flag and registrationSource field
 *
 * These examples are for reference and should not be imported in production code.
 */

import { Injectable } from '@nestjs/common';
import { IEventUpcaster } from '../event-upcaster.interface';
import { EventUpcaster } from '../event-upcaster.decorator';

/**
 * Version 1 of UserRegistered event (legacy schema)
 */
interface UserRegisteredV1 {
  eventType: 'UserRegistered';
  eventVersion: 1;
  aggregateId: string;
  data: {
    username: string;
    firstName: string;
    lastName: string;
    registeredAt: string;
  };
}

/**
 * Version 2 of UserRegistered event
 * Changes:
 * - Renamed username → email
 * - Combined firstName + lastName → fullName
 */
interface UserRegisteredV2 {
  eventType: 'UserRegistered';
  eventVersion: 2;
  aggregateId: string;
  data: {
    email: string;
    fullName: string;
    registeredAt: string;
  };
}

/**
 * Version 3 of UserRegistered event (current schema)
 * Changes:
 * - Added emailVerified flag (default false)
 * - Added registrationSource field (default 'web')
 */
interface UserRegisteredV3 {
  eventType: 'UserRegistered';
  eventVersion: 3;
  aggregateId: string;
  data: {
    email: string;
    fullName: string;
    emailVerified: boolean;
    registrationSource: 'web' | 'mobile' | 'api';
    registeredAt: string;
  };
}

/**
 * Upcasts UserRegistered from V1 to V2
 *
 * This demonstrates:
 * - Field renaming (username → email)
 * - Field combination (firstName + lastName → fullName)
 */
@EventUpcaster('UserRegistered', 1, 2)
@Injectable()
export class UserRegisteredV1ToV2Upcaster implements IEventUpcaster {
  readonly eventType = 'UserRegistered';
  readonly fromVersion = 1;
  readonly toVersion = 2;

  upcast(event: UserRegisteredV1): UserRegisteredV2 {
    return {
      eventType: event.eventType,
      eventVersion: 2,
      aggregateId: event.aggregateId,
      data: {
        email: event.data.username, // Renamed field
        fullName: `${event.data.firstName} ${event.data.lastName}`.trim(), // Combined fields
        registeredAt: event.data.registeredAt,
      },
    };
  }
}

/**
 * Upcasts UserRegistered from V2 to V3
 *
 * This demonstrates:
 * - Adding new required fields with sensible defaults
 * - Maintaining backward compatibility
 */
@EventUpcaster('UserRegistered', 2, 3)
@Injectable()
export class UserRegisteredV2ToV3Upcaster implements IEventUpcaster {
  readonly eventType = 'UserRegistered';
  readonly fromVersion = 2;
  readonly toVersion = 3;

  upcast(event: UserRegisteredV2): UserRegisteredV3 {
    return {
      eventType: event.eventType,
      eventVersion: 3,
      aggregateId: event.aggregateId,
      data: {
        ...event.data,
        emailVerified: false, // New field with default value
        registrationSource: 'web', // New field with default value
      },
    };
  }
}

/**
 * Example usage in a service:
 *
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @Inject('IEventStore') private readonly eventStore: IEventStore,
 *     private readonly upcasterRegistry: EventUpcasterRegistry
 *   ) {}
 *
 *   async loadUser(userId: string): Promise<User> {
 *     // Load events from event store
 *     const events = await this.eventStore.getEvents(userId);
 *
 *     // Get latest version
 *     const latestVersion = this.upcasterRegistry.getLatestVersion('UserRegistered');
 *
 *     // Upcast all events to latest version
 *     // This will automatically chain: V1 → V2 → V3
 *     const upcastedEvents = events.map(event => {
 *       if (event.eventType === 'UserRegistered') {
 *         return this.upcasterRegistry.upcast('UserRegistered', event.eventData, latestVersion);
 *       }
 *       return event.eventData;
 *     });
 *
 *     // Rebuild aggregate from upcasted events
 *     const user = new User(userId);
 *     for (const event of upcastedEvents) {
 *       user.apply(event);
 *     }
 *
 *     return user;
 *   }
 * }
 * ```
 *
 * Example module registration:
 *
 * ```typescript
 * @Module({
 *   imports: [
 *     EventStoreModule.forRoot({
 *       enableUpcasting: true,
 *       upcasters: [
 *         UserRegisteredV1ToV2Upcaster,
 *         UserRegisteredV2ToV3Upcaster,
 *       ]
 *     })
 *   ],
 *   providers: [UserService]
 * })
 * export class UserModule {}
 * ```
 */
