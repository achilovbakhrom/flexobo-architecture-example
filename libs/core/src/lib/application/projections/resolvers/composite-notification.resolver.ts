/**
 * Composite Notification Resolver
 *
 * Combines multiple resolvers and routes by event type.
 * Useful when different event types need different notification strategies.
 */

import { EventPayload } from '../base-projection';
import {
  INotificationResolver,
  NotificationIntent,
} from '../notification-resolver.interface';

/**
 * Configuration for mapping event types to resolvers
 */
export interface ResolverMapping<TEvent extends EventPayload = EventPayload> {
  /** Event types this resolver handles */
  eventTypes: string[];
  /** The resolver to use for these event types */
  resolver: INotificationResolver<TEvent>;
}

/**
 * Composite resolver that routes events to appropriate resolvers based on event type
 *
 * @typeParam TEvent - The event payload type
 */
export class CompositeNotificationResolver<
  TEvent extends EventPayload = EventPayload
> implements INotificationResolver<TEvent>
{
  private readonly resolverMap: Map<string, INotificationResolver<TEvent>>;

  /**
   * Create a composite resolver with mappings from event types to resolvers
   *
   * @param resolvers - Array of resolver mappings
   */
  constructor(resolvers: ResolverMapping<TEvent>[]) {
    this.resolverMap = new Map();

    for (const { eventTypes, resolver } of resolvers) {
      for (const eventType of eventTypes) {
        this.resolverMap.set(eventType, resolver);
      }
    }
  }

  /**
   * Routes the event to the appropriate resolver based on event type
   * Returns null if no resolver is configured for the event type
   */
  resolve(event: TEvent): NotificationIntent | null {
    const resolver = this.resolverMap.get(event.type);
    return resolver?.resolve(event) ?? null;
  }
}
