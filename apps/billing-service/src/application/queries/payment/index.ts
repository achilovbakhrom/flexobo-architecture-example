import { Inject, Injectable } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentProvider } from '../../../domain/constants/enums';
import {
  PAYMENT_READ_REPOSITORY,
  IPaymentReadRepository,
  PaymentReadData,
} from '../../../ports/payment.repository';

// ============ DTOs ============

export type PaymentDto = PaymentReadData;

export interface PaymentListResult {
  items: PaymentDto[];
  total: number;
  page: number;
  pageSize: number;
}

// Re-export for consumers
export { PAYMENT_READ_REPOSITORY, IPaymentReadRepository };

// ============ Queries ============

export class GetPaymentQuery implements IQuery {
  constructor(public readonly paymentId: string) {}
}

export class GetPaymentByExternalIdQuery implements IQuery {
  constructor(
    public readonly provider: PaymentProvider,
    public readonly externalId: string,
  ) {}
}

export class ListPaymentsBySubscriptionQuery implements IQuery {
  constructor(
    public readonly subscriptionId: string,
    public readonly limit?: number,
  ) {}
}

export class ListPaymentsByCompanyQuery implements IQuery {
  constructor(
    public readonly companyId: string,
    public readonly limit?: number,
  ) {}
}

// ============ Handlers ============

@Injectable()
@QueryHandler(GetPaymentQuery)
export class GetPaymentHandler implements IQueryHandler<GetPaymentQuery> {
  constructor(
    @Inject(PAYMENT_READ_REPOSITORY)
    private readonly paymentReadRepository: IPaymentReadRepository,
  ) {}

  async execute(query: GetPaymentQuery): Promise<PaymentDto | null> {
    return this.paymentReadRepository.findById(query.paymentId);
  }
}

@Injectable()
@QueryHandler(GetPaymentByExternalIdQuery)
export class GetPaymentByExternalIdHandler
  implements IQueryHandler<GetPaymentByExternalIdQuery>
{
  constructor(
    @Inject(PAYMENT_READ_REPOSITORY)
    private readonly paymentReadRepository: IPaymentReadRepository,
  ) {}

  async execute(query: GetPaymentByExternalIdQuery): Promise<PaymentDto | null> {
    return this.paymentReadRepository.findByExternalId(
      query.provider,
      query.externalId,
    );
  }
}

@Injectable()
@QueryHandler(ListPaymentsBySubscriptionQuery)
export class ListPaymentsBySubscriptionHandler
  implements IQueryHandler<ListPaymentsBySubscriptionQuery>
{
  constructor(
    @Inject(PAYMENT_READ_REPOSITORY)
    private readonly paymentReadRepository: IPaymentReadRepository,
  ) {}

  async execute(query: ListPaymentsBySubscriptionQuery): Promise<PaymentDto[]> {
    return this.paymentReadRepository.findBySubscriptionId(query.subscriptionId);
  }
}

@Injectable()
@QueryHandler(ListPaymentsByCompanyQuery)
export class ListPaymentsByCompanyHandler
  implements IQueryHandler<ListPaymentsByCompanyQuery>
{
  constructor(
    @Inject(PAYMENT_READ_REPOSITORY)
    private readonly paymentReadRepository: IPaymentReadRepository,
  ) {}

  async execute(query: ListPaymentsByCompanyQuery): Promise<PaymentDto[]> {
    return this.paymentReadRepository.findByCompanyId(
      query.companyId,
      query.limit,
    );
  }
}

export const PaymentQueryHandlers = [
  GetPaymentHandler,
  GetPaymentByExternalIdHandler,
  ListPaymentsBySubscriptionHandler,
  ListPaymentsByCompanyHandler,
];
