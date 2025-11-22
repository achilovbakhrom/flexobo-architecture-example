import 'reflect-metadata';

export const EVENT_HANDLER_METADATA = Symbol('EVENT_HANDLER_METADATA');

export interface EventSubscriberOptions {
  /**
   * Whether to process events in parallel for different aggregates
   */
  parallel?: boolean;

  /**
   * The key to use for partitioning messages (e.g., 'aggregateId')
   */
  partitionKey?: string;

  /**
   * Dead letter exchange configuration
   */
  deadLetterExchange?: string;
}

/**
 * Decorator for event handlers/subscribers
 * @param eventType The event type this handler subscribes to
 * @param options Subscription options
 */
export function EventSubscriber(
  eventType: string,
  options: EventSubscriberOptions = {}
): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(
      EVENT_HANDLER_METADATA,
      { eventType, options },
      target
    );
  };
}

/**
 * Gets the event metadata from a handler class
 * @param target The handler class
 */
export function getEventMetadata(
  target: object
): { eventType: string; options: EventSubscriberOptions } | undefined {
  return Reflect.getMetadata(EVENT_HANDLER_METADATA, target);
}
