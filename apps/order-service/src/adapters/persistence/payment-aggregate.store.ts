import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';
import { Payment, PaymentStatus, PaymentMethod, PaymentAmount } from '../../domain/payment.aggregate';
import { IPaymentAggregateStore } from '../../ports/payment-store.port';

interface PaymentSnapshotData {
  _id: string;
  orderId: string;
  amount: PaymentAmount;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  failureReason?: string;
  refundedAmount?: PaymentAmount;
  processedAt?: string;
}

@Injectable()
export class PaymentAggregateStore
  extends AggregateStore<Payment, PaymentSnapshotData>
  implements IPaymentAggregateStore
{
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Payment';
  }

  protected getAggregateRestorer(): AggregateRestorer<Payment, PaymentSnapshotData> {
    return {
      fromSnapshot(
        snapshotData: PaymentSnapshotData,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): Payment {
        return Payment.fromSnapshot(snapshotData, snapshotVersion, subsequentEvents);
      },

      fromEvents(events: DomainEvent[]): Payment {
        return Payment.fromEvents(events);
      },
    };
  }
}
