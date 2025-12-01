/**
 * Base type for event definitions.
 * Each event should have a literal type and its data shape.
 */
export type EventDefinition<
  TType extends string = string,
  TData = Record<string, unknown>,
> = {
  type: TType;
  data: TData;
};

/**
 * Domain event with discriminated union support.
 * When using a union of EventDefinitions, TypeScript will narrow
 * the `data` type based on the `type` field in switch/case statements.
 *
 * @example
 * ```typescript
 * // Define your event types with literal type strings
 * type OrderCreated = EventDefinition<'order.created', { userId: string; items: Item[] }>;
 * type OrderConfirmed = EventDefinition<'order.confirmed', { confirmedAt: Date }>;
 * type OrderCancelled = EventDefinition<'order.cancelled', { reason: string }>;
 *
 * // Create a union of all events
 * type OrderEvents = OrderCreated | OrderConfirmed | OrderCancelled;
 *
 * // Use in your aggregate - TypeScript narrows data type automatically
 * function apply(event: DomainEvent<OrderEvents>): void {
 *   switch (event.type) {
 *     case 'order.created':
 *       // event.data is { userId: string; items: Item[] }
 *       this.userId = event.data.userId;
 *       break;
 *     case 'order.confirmed':
 *       // event.data is { confirmedAt: Date }
 *       this.confirmedAt = event.data.confirmedAt;
 *       break;
 *     case 'order.cancelled':
 *       // event.data is { reason: string }
 *       console.log(event.data.reason);
 *       break;
 *   }
 * }
 * ```
 */
export type DomainEvent<T extends EventDefinition = EventDefinition> =
  T extends EventDefinition<infer TType, infer TData>
    ? {
        /**
         * The type/name of the event (e.g., 'UserRegistered', 'OrderCreated')
         */
        readonly type: TType;

        /**
         * Unique identifier of the aggregate that produced this event
         */
        readonly aggregateId: string;

        /**
         * Type of the aggregate (e.g., 'User', 'Order')
         */
        readonly aggregateType: string;

        /**
         * Version number of this event in the aggregate's event stream
         */
        readonly version: number;

        /**
         * Timestamp when the event occurred
         */
        readonly occurredAt: Date;

        /**
         * Event payload containing the actual data.
         * Type is inferred from the EventDefinition.
         */
        readonly data: TData;

        /**
         * Optional metadata (userId who triggered it, correlation ID, etc.)
         */
        readonly metadata?: Record<string, unknown>;
      }
    : never;

/**
 * Extract a specific event from a union based on its type.
 * Useful for handlers that only care about specific event types.
 *
 * @example
 * ```typescript
 * type OrderCreatedEvent = ExtractEvent<OrderEvents, 'order.created'>;
 * // Result: DomainEvent with data: { userId: string; items: Item[] }
 * ```
 */
export type ExtractEvent<
  TEvents extends EventDefinition,
  TType extends TEvents['type'],
> = DomainEvent<Extract<TEvents, { type: TType }>>;

// Backwards compatibility alias
export type DomainEventArg = EventDefinition;
