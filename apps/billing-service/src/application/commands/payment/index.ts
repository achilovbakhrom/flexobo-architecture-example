import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { PaymentAggregate } from '../../../domain/aggregates/payment.aggregate';
import { PaymentProvider, PaymentType } from '../../../domain/constants/enums';
import { PAYMENT_AGGREGATE_STORE } from '../../../ports/payment.repository';

export class InitiatePaymentCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly subscriptionId: string,
    public readonly companyId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly provider: PaymentProvider,
    public readonly paymentType: PaymentType,
    public readonly externalId?: string,
  ) {}
}

export class ProcessPaymentCommand implements ICommand {
  constructor(
    public readonly paymentId: string,
    public readonly externalId: string,
  ) {}
}

export class SucceedPaymentCommand implements ICommand {
  constructor(
    public readonly paymentId: string,
    public readonly externalId: string,
    public readonly paymentMethod?: {
      type: string;
      last4?: string;
      brand?: string;
    },
  ) {}
}

export class FailPaymentCommand implements ICommand {
  constructor(
    public readonly paymentId: string,
    public readonly reason: string,
  ) {}
}

export class RefundPaymentCommand implements ICommand {
  constructor(
    public readonly paymentId: string,
    public readonly amount?: number,
    public readonly reason?: string,
  ) {}
}

@Injectable()
@CommandHandler(InitiatePaymentCommand)
export class InitiatePaymentHandler implements ICommandHandler<InitiatePaymentCommand, PaymentAggregate> {
  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PaymentAggregate>,
  ) {}

  async execute(command: InitiatePaymentCommand): Promise<Result<PaymentAggregate, Error>> {
    try {
      const payment = PaymentAggregate.initiate({
        id: command.id,
        subscriptionId: command.subscriptionId,
        companyId: command.companyId,
        amount: command.amount,
        currency: command.currency,
        provider: command.provider,
        paymentType: command.paymentType,
        externalId: command.externalId,
      });

      await this.aggregateStore.save(payment);
      return new Success(payment);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(ProcessPaymentCommand)
export class ProcessPaymentHandler implements ICommandHandler<ProcessPaymentCommand, PaymentAggregate> {
  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PaymentAggregate>,
  ) {}

  async execute(command: ProcessPaymentCommand): Promise<Result<PaymentAggregate, Error>> {
    try {
      const payment = await this.aggregateStore.load(command.paymentId);
      if (!payment) {
        return new Failure(new NotFoundException(`Payment ${command.paymentId} not found`));
      }

      payment.process(command.externalId);
      await this.aggregateStore.save(payment);
      return new Success(payment);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(SucceedPaymentCommand)
export class SucceedPaymentHandler implements ICommandHandler<SucceedPaymentCommand, PaymentAggregate> {
  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PaymentAggregate>,
  ) {}

  async execute(command: SucceedPaymentCommand): Promise<Result<PaymentAggregate, Error>> {
    try {
      const payment = await this.aggregateStore.load(command.paymentId);
      if (!payment) {
        return new Failure(new NotFoundException(`Payment ${command.paymentId} not found`));
      }

      payment.succeed(command.externalId, command.paymentMethod);
      await this.aggregateStore.save(payment);
      return new Success(payment);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(FailPaymentCommand)
export class FailPaymentHandler implements ICommandHandler<FailPaymentCommand, PaymentAggregate> {
  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PaymentAggregate>,
  ) {}

  async execute(command: FailPaymentCommand): Promise<Result<PaymentAggregate, Error>> {
    try {
      const payment = await this.aggregateStore.load(command.paymentId);
      if (!payment) {
        return new Failure(new NotFoundException(`Payment ${command.paymentId} not found`));
      }

      payment.fail(command.reason);
      await this.aggregateStore.save(payment);
      return new Success(payment);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(RefundPaymentCommand)
export class RefundPaymentHandler implements ICommandHandler<RefundPaymentCommand, PaymentAggregate> {
  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PaymentAggregate>,
  ) {}

  async execute(command: RefundPaymentCommand): Promise<Result<PaymentAggregate, Error>> {
    try {
      const payment = await this.aggregateStore.load(command.paymentId);
      if (!payment) {
        return new Failure(new NotFoundException(`Payment ${command.paymentId} not found`));
      }

      payment.refund(command.amount, command.reason);
      await this.aggregateStore.save(payment);
      return new Success(payment);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export const PaymentCommandHandlers = [
  InitiatePaymentHandler,
  ProcessPaymentHandler,
  SucceedPaymentHandler,
  FailPaymentHandler,
  RefundPaymentHandler,
];
