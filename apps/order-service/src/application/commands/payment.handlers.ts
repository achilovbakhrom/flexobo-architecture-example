/**
 * Payment command handlers
 *
 * Payment is event-sourced. These handlers:
 * - Load aggregate from events
 * - Execute business logic on aggregate
 * - Save uncommitted events
 */

import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  DomainEvent,
} from '@flexobo/core';
import { Payment, PaymentMethod } from '../../domain/payment.aggregate';
import {
  IPaymentEventRepository,
  PAYMENT_EVENT_REPOSITORY,
} from '../../ports/payment.repository.port';
import { PaymentStoredEventDto } from '../dto/payment.dto';
import {
  CreatePaymentCommand,
  ProcessPaymentCommand,
  CompletePaymentCommand,
  FailPaymentCommand,
  RefundPaymentCommand,
} from './payment.commands';
import { Inject } from '@nestjs/common';

/**
 * Converts stored events to domain events for aggregate reconstruction
 */
function toDomainEvents(stored: PaymentStoredEventDto[]): DomainEvent[] {
  return stored.map((s) => ({
    type: s.eventType,
    aggregateId: s.aggregateId,
    aggregateType: s.aggregateType,
    version: s.version,
    occurredAt: s.occurredAt,
    data: s.eventData,
  }));
}

/**
 * Loads a Payment aggregate from stored events
 */
async function loadPayment(
  repository: IPaymentEventRepository,
  paymentId: string
): Promise<Payment | null> {
  const storedEvents = await repository.getEvents(paymentId);

  if (storedEvents.length === 0) {
    return null;
  }

  const events = toDomainEvents(storedEvents);
  return Payment.fromEvents(events);
}

/**
 * Saves uncommitted events from a Payment aggregate
 */
async function savePayment(
  repository: IPaymentEventRepository,
  payment: Payment
): Promise<void> {
  const uncommittedEvents = payment.getUncommittedEvents();

  if (uncommittedEvents.length === 0) {
    return;
  }

  const expectedVersion = payment.version - uncommittedEvents.length;

  const events = uncommittedEvents.map((event) => ({
    type: event.type,
    data: event.data,
    aggregateType: event.aggregateType,
  }));

  await repository.appendEvents(payment.id, events, expectedVersion);

  payment.markEventsAsCommitted();
}

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler
  implements ICommandHandler<CreatePaymentCommand, void>
{
  constructor(
    @Inject(PAYMENT_EVENT_REPOSITORY)
    private readonly eventRepository: IPaymentEventRepository
  ) {}

  async execute(command: CreatePaymentCommand): Promise<Result<void, Error>> {
    try {
      const exists = await this.eventRepository.exists(command.paymentId);
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

      await savePayment(this.eventRepository, payment);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ProcessPaymentCommand)
export class ProcessPaymentHandler
  implements ICommandHandler<ProcessPaymentCommand, void>
{
  constructor(
    @Inject(PAYMENT_EVENT_REPOSITORY)
    private readonly eventRepository: IPaymentEventRepository
  ) {}

  async execute(command: ProcessPaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await loadPayment(this.eventRepository, command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.process();

      await savePayment(this.eventRepository, payment);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(CompletePaymentCommand)
export class CompletePaymentHandler
  implements ICommandHandler<CompletePaymentCommand, void>
{
  constructor(
    @Inject(PAYMENT_EVENT_REPOSITORY)
    private readonly eventRepository: IPaymentEventRepository
  ) {}

  async execute(command: CompletePaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await loadPayment(this.eventRepository, command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.complete(command.transactionId);

      await savePayment(this.eventRepository, payment);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(FailPaymentCommand)
export class FailPaymentHandler
  implements ICommandHandler<FailPaymentCommand, void>
{
  constructor(
    @Inject(PAYMENT_EVENT_REPOSITORY)
    private readonly eventRepository: IPaymentEventRepository
  ) {}

  async execute(command: FailPaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await loadPayment(this.eventRepository, command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.fail(command.reason);

      await savePayment(this.eventRepository, payment);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(RefundPaymentCommand)
export class RefundPaymentHandler
  implements ICommandHandler<RefundPaymentCommand, void>
{
  constructor(
    @Inject(PAYMENT_EVENT_REPOSITORY)
    private readonly eventRepository: IPaymentEventRepository
  ) {}

  async execute(command: RefundPaymentCommand): Promise<Result<void, Error>> {
    try {
      const payment = await loadPayment(this.eventRepository, command.paymentId);

      if (!payment) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Payment ${command.paymentId} not found`),
        };
      }

      payment.refund(command.amount, command.reason);

      await savePayment(this.eventRepository, payment);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
