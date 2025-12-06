import { Inject, Injectable, Optional } from '@nestjs/common';
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
 * Generic aggregate store base class
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
