import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
} from '@flexobo/core';
import { Inject, Logger } from '@nestjs/common';
import { Payment, PaymentMethod } from '../../domain/payment.aggregate';
import {
  IPaymentAggregateStore,
  PAYMENT_AGGREGATE_STORE,
} from '../../ports/payment-store.port';
import {
  CreatePaymentCommand,
  ProcessPaymentCommand,
  CompletePaymentCommand,
  FailPaymentCommand,
  RefundPaymentCommand,
} from './payment.commands';

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler
  implements ICommandHandler<CreatePaymentCommand, void>
{
  private readonly logger = new Logger(CreatePaymentHandler.name);

  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly store: IPaymentAggregateStore
  ) {}

  async execute(command: CreatePaymentCommand): Promise<Result<void, Error>> {
    try {
      const exists = await this.store.exists(command.paymentId);
      if (exists) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} already exists`),
        };
      }

      const payment = Payment.create(
        command.paymentId,
        command.orderId,
        command.amount,
        command.currency,
        command.paymentMethod as PaymentMethod
      );

      await this.store.save(payment);

      this.logger.log(`Created payment ${command.paymentId} for order ${command.orderId}`);

      return new Success(undefined);
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ProcessPaymentCommand)
export class ProcessPaymentHandler
  implements ICommandHandler<ProcessPaymentCommand, void>
{
  private readonly logger = new Logger(ProcessPaymentHandler.name);

  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly store: IPaymentAggregateStore
  ) {}

  async execute(command: ProcessPaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await this.store.load(command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.process();

      await this.store.save(payment);

      this.logger.log(`Processing payment ${command.paymentId}`);

      return new Success(undefined);
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(CompletePaymentCommand)
export class CompletePaymentHandler
  implements ICommandHandler<CompletePaymentCommand, void>
{
  private readonly logger = new Logger(CompletePaymentHandler.name);

  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly store: IPaymentAggregateStore
  ) {}

  async execute(command: CompletePaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await this.store.load(command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.complete(command.transactionId);

      await this.store.save(payment);

      this.logger.log(`Completed payment ${command.paymentId} with transaction ${command.transactionId}`);

      return new Success(undefined);
    } catch (error) {
      this.logger.error(`Failed to complete payment: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(FailPaymentCommand)
export class FailPaymentHandler
  implements ICommandHandler<FailPaymentCommand, void>
{
  private readonly logger = new Logger(FailPaymentHandler.name);

  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly store: IPaymentAggregateStore
  ) {}

  async execute(command: FailPaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await this.store.load(command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.fail(command.reason);

      await this.store.save(payment);

      this.logger.log(`Failed payment ${command.paymentId}: ${command.reason}`);

      return new Success(undefined);
    } catch (error) {
      this.logger.error(`Failed to fail payment: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(RefundPaymentCommand)
export class RefundPaymentHandler
  implements ICommandHandler<RefundPaymentCommand, void>
{
  private readonly logger = new Logger(RefundPaymentHandler.name);

  constructor(
    @Inject(PAYMENT_AGGREGATE_STORE)
    private readonly store: IPaymentAggregateStore
  ) {}

  async execute(command: RefundPaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await this.store.load(command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.refund(command.amount, command.reason);

      await this.store.save(payment);

      this.logger.log(`Refunded payment ${command.paymentId}: amount=${command.amount}`);

      return new Success(undefined);
    } catch (error) {
      this.logger.error(`Failed to refund payment: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
