import { Injectable } from '@nestjs/common';
import { GenericAggregateStore, EventSourcedAggregate } from '@flexobo/core';
import { Order, OrderSnapshotData } from '../../domain/order.aggregate';
import { IOrderAggregateStore } from '../../ports/order-store.port';

@Injectable()
export class OrderAggregateStore
  extends GenericAggregateStore<Order, OrderSnapshotData>
  implements IOrderAggregateStore
{
  protected readonly aggregateType = 'Order';
  protected readonly aggregateClass: EventSourcedAggregate<Order, OrderSnapshotData> = Order;
}
