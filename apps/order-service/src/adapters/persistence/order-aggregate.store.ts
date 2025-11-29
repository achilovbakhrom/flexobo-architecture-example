import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';
import { Order, OrderItem, OrderStatus } from '../../domain/order.aggregate';
import { IOrderAggregateStore } from '../../ports/order-store.port';

/**
 * Snapshot data structure for Order aggregate
 */
interface OrderSnapshotData {
  _id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  trackingNumber?: string;
}

/**
 * Order Aggregate Store
 *
 * Following Go gaze-executor pattern:
 * - Extends AggregateStore from core
 * - Handles loading/saving Order aggregates to event store
 * - Publishes events to broker via outbox
 *
 * Projections (OrderEventConsumer) handle:
 * - Updating read models
 * - Creating snapshots
 */
@Injectable()
export class OrderAggregateStore
  extends AggregateStore<Order, OrderSnapshotData>
  implements IOrderAggregateStore
{
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Order';
  }

  protected getAggregateRestorer(): AggregateRestorer<Order, OrderSnapshotData> {
    return {
      fromSnapshot(
        snapshotData: OrderSnapshotData,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): Order {
        return Order.fromSnapshot(snapshotData, snapshotVersion, subsequentEvents);
      },

      fromEvents(events: DomainEvent[]): Order {
        return Order.fromEvents(events);
      },
    };
  }
}
