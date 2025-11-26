/**
 * Payment query handlers
 *
 * Queries use the read model (CQRS pattern).
 */

import { QueryHandler, IQueryHandler } from '@flexobo/core';
import {
  IPaymentReadModelRepository,
  PAYMENT_READ_MODEL_REPOSITORY,
} from '../../ports/payment.repository.port';
import {
  GetPaymentByIdQuery,
  GetPaymentsByOrderQuery,
  GetPaymentsByStatusQuery,
  GetPaymentByTransactionIdQuery,
} from './payment.queries';
import { Inject } from '@nestjs/common';
import { PaymentDto } from '../dto/payment.dto';

@QueryHandler(GetPaymentByIdQuery)
export class GetPaymentByIdHandler
  implements IQueryHandler<GetPaymentByIdQuery>
{
  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IPaymentReadModelRepository
  ) {}

  async execute(query: GetPaymentByIdQuery): Promise<PaymentDto | null> {
    return this.readModelRepository.findById(query.paymentId);
  }
}

@QueryHandler(GetPaymentsByOrderQuery)
export class GetPaymentsByOrderHandler
  implements IQueryHandler<GetPaymentsByOrderQuery>
{
  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IPaymentReadModelRepository
  ) {}

  async execute(query: GetPaymentsByOrderQuery): Promise<{
    orderId: string;
    payments: PaymentDto[];
  }> {
    const payments = await this.readModelRepository.findByOrderId(query.orderId);

    return {
      orderId: query.orderId,
      payments,
    };
  }
}

@QueryHandler(GetPaymentsByStatusQuery)
export class GetPaymentsByStatusHandler
  implements IQueryHandler<GetPaymentsByStatusQuery>
{
  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IPaymentReadModelRepository
  ) {}

  async execute(query: GetPaymentsByStatusQuery): Promise<{
    status: string;
    payments: PaymentDto[];
  }> {
    const payments = await this.readModelRepository.findByStatus(query.status, {
      limit: query.limit,
      offset: query.offset,
    });

    return {
      status: query.status,
      payments,
    };
  }
}

@QueryHandler(GetPaymentByTransactionIdQuery)
export class GetPaymentByTransactionIdHandler
  implements IQueryHandler<GetPaymentByTransactionIdQuery>
{
  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IPaymentReadModelRepository
  ) {}

  async execute(query: GetPaymentByTransactionIdQuery): Promise<PaymentDto | null> {
    return this.readModelRepository.findByTransactionId(query.transactionId);
  }
}
