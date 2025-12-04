import { Injectable } from '@nestjs/common';
import { GenericAggregateStore, EventSourcedAggregate } from '@flexobo/core';
import { Payment, PaymentSnapshotData } from '../../domain/payment.aggregate';
import { IPaymentAggregateStore } from '../../ports/payment-store.port';

@Injectable()
export class PaymentAggregateStore
  extends GenericAggregateStore<Payment, PaymentSnapshotData>
  implements IPaymentAggregateStore
{
  protected readonly aggregateType = 'Payment';
  protected readonly aggregateClass: EventSourcedAggregate<Payment, PaymentSnapshotData> = Payment;
}
