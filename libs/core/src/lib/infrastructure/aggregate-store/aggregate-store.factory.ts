import { Inject, Injectable, Optional, Type } from '@nestjs/common';
import { AggregateRoot } from '../../domain/aggregate-root';
import { DomainEvent } from '../../domain/domain-event.interface';
import { IEventStore } from '../event-store/event-store.interface';
import { OutboxService } from '../outbox/outbox.service';
import { SnapshotService } from '../snapshot/snapshot.service';
import { AggregateStore, AggregateRestorer } from './aggregate-store';

/**
 * Interface for aggregates that support event sourcing
 * Aggregates must implement static methods for reconstitution
 */
export interface EventSourcedAggregate<T extends AggregateRoot, TSnapshot> {
  fromSnapshot(
    snapshotData: TSnapshot,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): T;
  fromEvents(events: DomainEvent[]): T;
}

/**
 * Configuration for creating an aggregate store
 */
export interface AggregateStoreConfig<T extends AggregateRoot, TSnapshot> {
  aggregateType: string;
  aggregateClass: EventSourcedAggregate<T, TSnapshot>;
}

/**
 * Factory function to create aggregate stores dynamically
 *
 * Usage:
 * ```typescript
 * const OrderStore = createAggregateStore({
 *   aggregateType: 'Order',
 *   aggregateClass: Order,
 * });
 *
 * // In module providers:
 * {
 *   provide: ORDER_AGGREGATE_STORE,
 *   useClass: OrderStore,
 * }
 * ```
 */
export function createAggregateStore<T extends AggregateRoot, TSnapshot>(
  config: AggregateStoreConfig<T, TSnapshot>
): Type<AggregateStore<T, TSnapshot>> {
  @Injectable()
  class DynamicAggregateStore extends AggregateStore<T, TSnapshot> {
    constructor(
      @Inject('IEventStore') eventStore: IEventStore,
      outboxService: OutboxService,
      @Optional() snapshotService?: SnapshotService
    ) {
      super(eventStore, outboxService, snapshotService);
    }

    protected getAggregateType(): string {
      return config.aggregateType;
    }

    protected getAggregateRestorer(): AggregateRestorer<T, TSnapshot> {
      return {
        fromSnapshot(
          snapshotData: TSnapshot,
          snapshotVersion: number,
          subsequentEvents: DomainEvent[]
        ): T {
          return config.aggregateClass.fromSnapshot(
            snapshotData,
            snapshotVersion,
            subsequentEvents
          );
        },

        fromEvents(events: DomainEvent[]): T {
          return config.aggregateClass.fromEvents(events);
        },
      };
    }
  }

  // Set a meaningful name for debugging
  Object.defineProperty(DynamicAggregateStore, 'name', {
    value: `${config.aggregateType}AggregateStore`,
  });

  return DynamicAggregateStore;
}

/**
 * Alternative: Class-based factory for more explicit typing
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class OrderAggregateStore extends GenericAggregateStore<Order, OrderSnapshotData> {
 *   protected readonly aggregateType = 'Order';
 *   protected readonly aggregateClass = Order;
 * }
 * ```
 */
@Injectable()
export abstract class GenericAggregateStore<
  T extends AggregateRoot,
  TSnapshot
> extends AggregateStore<T, TSnapshot> {
  protected abstract readonly aggregateType: string;
  protected abstract readonly aggregateClass: EventSourcedAggregate<T, TSnapshot>;

  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return this.aggregateType;
  }

  protected getAggregateRestorer(): AggregateRestorer<T, TSnapshot> {
    const aggregateClass = this.aggregateClass;
    return {
      fromSnapshot(
        snapshotData: TSnapshot,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): T {
        return aggregateClass.fromSnapshot(
          snapshotData,
          snapshotVersion,
          subsequentEvents
        );
      },

      fromEvents(events: DomainEvent[]): T {
        return aggregateClass.fromEvents(events);
      },
    };
  }
}
