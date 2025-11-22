# Event Upcasting

Event upcasting is a mechanism for handling event schema evolution in event-sourced systems. As your system evolves, you may need to change the structure of your events. Upcasting allows you to transform old events to match the current schema when replaying the event stream.

## Concept

When rebuilding an aggregate from its event stream, you might encounter events stored with older schemas. Event upcasting automatically transforms these legacy events to the current version, allowing your domain logic to work with a single, current event schema.

## Architecture

The event upcasting infrastructure consists of:

1. **IEventUpcaster**: Interface defining an upcaster
2. **@EventUpcaster**: Decorator for marking upcaster classes
3. **EventUpcasterRegistry**: Registry that manages and chains upcasters
4. **EventStoreModule**: Module configuration with upcasting support

## Usage

### 1. Define Event Versions

```typescript
// Version 1 (legacy)
interface UserRegisteredV1 {
  eventType: 'UserRegistered';
  eventVersion: 1;
  data: {
    username: string;
    firstName: string;
    lastName: string;
  };
}

// Version 2 (current)
interface UserRegisteredV2 {
  eventType: 'UserRegistered';
  eventVersion: 2;
  data: {
    email: string;
    fullName: string;
  };
}
```

### 2. Create an Upcaster

```typescript
import { Injectable } from '@nestjs/common';
import { IEventUpcaster, EventUpcaster } from '@flexobo/core';

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
      data: {
        email: event.data.username, // Renamed field
        fullName: `${event.data.firstName} ${event.data.lastName}`.trim(), // Combined fields
      },
    };
  }
}
```

### 3. Register the Upcaster in Your Module

```typescript
import { Module } from '@nestjs/common';
import { EventStoreModule } from '@flexobo/core';
import { UserRegisteredV1ToV2Upcaster } from './upcasters';

@Module({
  imports: [
    EventStoreModule.forRoot({
      enableUpcasting: true,
      upcasters: [
        UserRegisteredV1ToV2Upcaster,
        // Add more upcasters here
      ],
    }),
  ],
})
export class UserModule {}
```

### 4. Use Upcasting in Your Service

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IEventStore, EventUpcasterRegistry } from '@flexobo/core';

@Injectable()
export class UserService {
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore,
    private readonly upcasterRegistry: EventUpcasterRegistry
  ) {}

  async loadUser(userId: string): Promise<User> {
    // Load events from event store
    const storedEvents = await this.eventStore.getEvents(userId);
    
    // Get the latest version for UserRegistered events
    const latestVersion = this.upcasterRegistry.getLatestVersion('UserRegistered');
    
    // Upcast all events to the latest version
    const upcastedEvents = storedEvents.map(stored => {
      if (stored.eventType === 'UserRegistered') {
        return this.upcasterRegistry.upcast(
          'UserRegistered',
          stored.eventData,
          latestVersion
        );
      }
      return stored.eventData;
    });
    
    // Rebuild aggregate from upcasted events
    const user = new User(userId);
    for (const event of upcastedEvents) {
      user.apply(event);
    }
    
    return user;
  }
}
```

## Chaining Multiple Upcasters

The registry automatically chains upcasters when multiple version jumps are needed:

```typescript
// V1 → V2
@EventUpcaster('UserRegistered', 1, 2)
@Injectable()
export class UserRegisteredV1ToV2Upcaster implements IEventUpcaster {
  // ... implementation
}

// V2 → V3
@EventUpcaster('UserRegistered', 2, 3)
@Injectable()
export class UserRegisteredV2ToV3Upcaster implements IEventUpcaster {
  // ... implementation
}

// Usage: automatically chains V1 → V2 → V3
const upcastedEvent = registry.upcast('UserRegistered', eventV1, 3);
```

## API Reference

### IEventUpcaster

```typescript
interface IEventUpcaster {
  readonly eventType: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  upcast(event: any): any;
}
```

### @EventUpcaster Decorator

```typescript
@EventUpcaster(eventType: string, fromVersion: number, toVersion: number)
```

### EventUpcasterRegistry Methods

#### `register(upcaster: IEventUpcaster): void`
Manually register an upcaster.

#### `upcast(eventType: string, event: any, targetVersion: number): any`
Upcast a single event to the target version. Automatically chains multiple upcasters if needed.

#### `upcastMany(eventType: string, events: any[], targetVersion: number): any[]`
Upcast multiple events to the target version.

#### `getLatestVersion(eventType: string): number`
Get the highest available version for an event type.

#### `hasUpcastPath(eventType: string, fromVersion: number, toVersion: number): boolean`
Check if an upcasting path exists between two versions.

## Best Practices

### 1. Always Increment Event Versions

When changing an event schema, always create a new version:

```typescript
// Don't modify the existing event
interface UserRegisteredV1 { ... }

// Create a new version instead
interface UserRegisteredV2 { ... }
```

### 2. Make Upcasters Pure Functions

Upcasters should not have side effects:

```typescript
// ✅ Good: Pure transformation
upcast(event: V1): V2 {
  return {
    eventVersion: 2,
    data: { ...transformedData }
  };
}

// ❌ Bad: Side effects
upcast(event: V1): V2 {
  this.logger.log('Upcasting...'); // Side effect!
  await this.database.save(...); // Async operation!
  return transformed;
}
```

### 3. Handle Missing Fields Gracefully

Provide sensible defaults for new fields:

```typescript
upcast(event: V1): V2 {
  return {
    ...event,
    eventVersion: 2,
    data: {
      ...event.data,
      // New field with default value
      emailVerified: false,
      // New field inferred from existing data
      registrationSource: event.data.mobileApp ? 'mobile' : 'web',
    }
  };
}
```

### 4. Keep Old Event Definitions

Don't delete old event type definitions—you'll need them for upcasters:

```typescript
// Keep these for upcasters
interface UserRegisteredV1 { ... }
interface UserRegisteredV2 { ... }

// Current version used in domain logic
interface UserRegisteredV3 { ... }
```

### 5. Test Upcasters Thoroughly

```typescript
describe('UserRegisteredV1ToV2Upcaster', () => {
  it('should transform username to email', () => {
    const v1Event = {
      eventVersion: 1,
      data: { username: 'john@example.com', firstName: 'John', lastName: 'Doe' }
    };
    
    const v2Event = upcaster.upcast(v1Event);
    
    expect(v2Event.eventVersion).toBe(2);
    expect(v2Event.data.email).toBe('john@example.com');
    expect(v2Event.data.fullName).toBe('John Doe');
  });
});
```

## Migration Strategy

### Gradual Migration

You don't need to migrate all events immediately. Upcasting happens on-the-fly during event replay:

1. Deploy new code with upcasters
2. Events are upcasted as aggregates are loaded
3. Old events remain unchanged in storage
4. System works with mixed event versions

### Bulk Migration (Optional)

For performance-critical systems, you can bulk-migrate events:

```typescript
async migrateEvents(aggregateType: string) {
  const events = await this.eventStore.getEventsByAggregateType(aggregateType);
  const latestVersion = this.upcasterRegistry.getLatestVersion(aggregateType);
  
  for (const event of events) {
    if (event.eventVersion < latestVersion) {
      const upcasted = this.upcasterRegistry.upcast(
        event.eventType,
        event.eventData,
        latestVersion
      );
      
      // Store the upcasted event
      await this.eventStore.replaceEvent(event.id, upcasted);
    }
  }
}
```

## Examples

See `__examples__/user-registered.upcasters.ts` for a complete working example demonstrating:
- Field renaming (username → email)
- Field combination (firstName + lastName → fullName)
- Adding new fields with defaults
- Multi-version chaining (V1 → V2 → V3)

## Limitations

1. **No Downcasting**: You cannot downcast from a newer version to an older version
2. **Linear Paths**: Each version must have a path to the next version (no branching)
3. **Type Safety**: TypeScript types are not enforced at runtime due to `any` types in interfaces

## Troubleshooting

### "No upcasters registered for event type"

Make sure you've registered the upcaster in your module:

```typescript
EventStoreModule.forRoot({
  upcasters: [YourUpcaster]
})
```

### "No upcasting path found"

Ensure you have upcasters for all intermediate versions:

```typescript
// If you want V1 → V3, you need:
@EventUpcaster('MyEvent', 1, 2) // V1 → V2
@EventUpcaster('MyEvent', 2, 3) // V2 → V3
```

### "Cannot downcast event"

You're trying to convert a newer event to an older version, which is not supported.
