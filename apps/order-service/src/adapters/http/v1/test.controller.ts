/**
 * Test Controller for Error Simulation
 *
 * This controller is for demonstration/testing purposes only.
 * It simulates various error scenarios to show how the system handles failures.
 *
 * Test types:
 * 1. Event simulation (simulate/*) - emit local events for testing handlers
 * 2. Consumer errors (dlq/*) - errors in consumer, go to DLQ after retries
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PAYMENT_EVENTS,
  EXCHANGES,
  ROUTING_KEYS,
} from '../../../domain/events/event.constants';
import { MESSAGE_PUBLISHER, IMessagePublisher } from '@flexobo/core';

class SimulatePaymentFailedDto {
  @ApiProperty({
    description: 'Order ID to simulate payment failure for',
    example: 'order-123 or non-existent-order',
  })
  orderId!: string;

  @ApiProperty({
    description: 'Payment ID (optional, will be generated if not provided)',
    required: false,
    example: 'payment-456',
  })
  paymentId?: string;

  @ApiProperty({
    description: 'Reason for payment failure',
    required: false,
    example: 'Insufficient funds',
  })
  reason?: string;
}

class SimulatePaymentCompletedDto {
  @ApiProperty({
    description: 'Order ID to simulate payment completion for',
    example: 'order-123',
  })
  orderId!: string;

  @ApiProperty({
    description: 'Payment ID (optional)',
    required: false,
    example: 'payment-456',
  })
  paymentId?: string;

  @ApiProperty({
    description: 'Transaction ID (optional)',
    required: false,
    example: 'txn-789',
  })
  transactionId?: string;
}

class SimulatePaymentRefundedDto {
  @ApiProperty({
    description: 'Order ID to simulate payment refund for',
    example: 'order-123',
  })
  orderId!: string;

  @ApiProperty({
    description: 'Payment ID (optional)',
    required: false,
    example: 'payment-456',
  })
  paymentId?: string;

  @ApiProperty({
    description: 'Refund amount',
    required: false,
    example: 100,
  })
  amount?: number;

  @ApiProperty({
    description: 'Reason for refund',
    required: false,
    example: 'Customer requested refund',
  })
  reason?: string;
}

class TriggerDlqDto {
  @ApiProperty({
    description: 'Optional message to include in the poison event',
    required: false,
    example: 'Test DLQ flow',
  })
  message?: string;
}

@ApiTags('Test - Error Simulation')
@Controller('v1/test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher
  ) {}

  /**
   * Simulates a PaymentFailed event being emitted locally.
   *
   * This bypasses RabbitMQ entirely and directly emits to EventEmitter2.
   * Use this to test:
   * - Event handler processing of payment failures
   * - What happens when handler tries to update a non-existent order
   * - Error logging behavior
   */
  @Post('simulate/payment-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate PaymentFailed event',
    description: `
      Directly emits a PAYMENT_EVENTS.FAILED event to test event handling.

      Test scenarios:
      1. Use a real orderId to test normal flow
      2. Use a fake orderId (e.g., "non-existent-order") to see error handling
      3. Check logs to see how errors are handled
    `,
  })
  @ApiBody({ type: SimulatePaymentFailedDto })
  @ApiResponse({ status: 200, description: 'Event emitted' })
  async simulatePaymentFailed(@Body() dto: SimulatePaymentFailedDto) {
    const paymentId = dto.paymentId || `test-payment-${Date.now()}`;

    this.logger.warn(
      `[TEST] Simulating PaymentFailed event for order: ${dto.orderId}`
    );

    // This is exactly what PaymentEventConsumer does after updating read model
    this.eventEmitter.emit(PAYMENT_EVENTS.FAILED, {
      aggregateId: paymentId,
      eventType: 'PaymentFailed',
      data: {
        orderId: dto.orderId,
        reason: dto.reason || 'Simulated payment failure',
      },
      version: 1,
    });

    return {
      message: 'PaymentFailed event emitted',
      note: 'Check server logs to see event handling. Order aggregate tracks payment failures and auto-cancels after 3 failures.',
      emittedEvent: {
        type: PAYMENT_EVENTS.FAILED,
        paymentId,
        orderId: dto.orderId,
        reason: dto.reason || 'Simulated payment failure',
      },
    };
  }

  /**
   * Simulates a PaymentCompleted event being emitted locally.
   *
   * Use this to test:
   * - Handler marking order as paid
   * - What happens when trying to mark a non-existent order as paid
   */
  @Post('simulate/payment-completed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate PaymentCompleted event',
    description: `
      Directly emits a PAYMENT_EVENTS.COMPLETED event.

      Test scenarios:
      1. Use a real orderId with INVENTORY_RESERVED status to test normal flow
      2. Use a fake orderId to see error handling
      3. Use an orderId with wrong status to see domain validation errors
    `,
  })
  @ApiBody({ type: SimulatePaymentCompletedDto })
  @ApiResponse({ status: 200, description: 'Event emitted' })
  async simulatePaymentCompleted(@Body() dto: SimulatePaymentCompletedDto) {
    const paymentId = dto.paymentId || `test-payment-${Date.now()}`;
    const transactionId = dto.transactionId || `txn-${Date.now()}`;

    this.logger.warn(
      `[TEST] Simulating PaymentCompleted event for order: ${dto.orderId}`
    );

    this.eventEmitter.emit(PAYMENT_EVENTS.COMPLETED, {
      aggregateId: paymentId,
      eventType: 'PaymentCompleted',
      data: {
        orderId: dto.orderId,
        transactionId,
        processedAt: new Date().toISOString(),
      },
      version: 1,
    });

    return {
      message: 'PaymentCompleted event emitted',
      note: 'Check server logs to see event handling.',
      emittedEvent: {
        type: PAYMENT_EVENTS.COMPLETED,
        paymentId,
        orderId: dto.orderId,
        transactionId,
      },
    };
  }

  /**
   * Simulates a PaymentRefunded event being emitted locally.
   */
  @Post('simulate/payment-refunded')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate PaymentRefunded event',
    description: 'Directly emits a PAYMENT_EVENTS.REFUNDED event.',
  })
  @ApiBody({ type: SimulatePaymentRefundedDto })
  @ApiResponse({ status: 200, description: 'Event emitted' })
  async simulatePaymentRefunded(@Body() dto: SimulatePaymentRefundedDto) {
    const paymentId = dto.paymentId || `test-payment-${Date.now()}`;

    this.logger.warn(
      `[TEST] Simulating PaymentRefunded event for order: ${dto.orderId}`
    );

    this.eventEmitter.emit(PAYMENT_EVENTS.REFUNDED, {
      aggregateId: paymentId,
      eventType: 'PaymentRefunded',
      data: {
        orderId: dto.orderId,
        amount: dto.amount || 100,
        reason: dto.reason || 'Simulated refund',
      },
      version: 1,
    });

    return {
      message: 'PaymentRefunded event emitted',
      note: 'Check server logs to see event handling.',
      emittedEvent: {
        type: PAYMENT_EVENTS.REFUNDED,
        paymentId,
        orderId: dto.orderId,
        amount: dto.amount || 100,
        reason: dto.reason || 'Simulated refund',
      },
    };
  }

  // ============================================================
  // DLQ Test Endpoints - These actually go through RabbitMQ
  // ============================================================

  /**
   * Publishes a "poison" message to RabbitMQ that will always fail.
   *
   * Flow:
   * 1. Message published to RabbitMQ exchange
   * 2. Consumer receives message and throws error
   * 3. Message is retried 3 times (with backoff)
   * 4. After 3 failures, message goes to Dead Letter Queue
   *
   * Check RabbitMQ management UI to see the message in DLQ.
   */
  @Post('dlq/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger Dead Letter Queue flow',
    description: `
      Publishes a poison message to RabbitMQ that will fail in the consumer.
      After 3 retries, the message will be sent to the Dead Letter Queue.

      Watch the logs to see:
      1. Initial processing attempt
      2. Retry attempts (3 total)
      3. Final rejection to DLQ

      Check RabbitMQ Management UI (http://localhost:15672) -> Queues -> flexobo.dead-letter
    `,
  })
  @ApiBody({ type: TriggerDlqDto })
  @ApiResponse({ status: 200, description: 'Poison message published' })
  async triggerDlq(@Body() dto: TriggerDlqDto) {
    const eventId = `poison-${Date.now()}`;
    const aggregateId = `test-payment-${Date.now()}`;

    this.logger.warn(`[DLQ TEST] Publishing poison message: ${eventId}`);

    // Publish directly to RabbitMQ - this will be picked up by PaymentEventConsumer
    const poisonEvent = {
      aggregateId,
      aggregateType: 'Payment',
      type: 'PaymentPoisonTest', // This type triggers error in consumer
      version: 1,
      occurredAt: new Date().toISOString(),
      data: {
        message: dto.message || 'This is a poison message for DLQ testing',
        testId: eventId,
      },
      metadata: {
        source: 'test-controller',
        triggeredAt: new Date().toISOString(),
      },
    };

    await this.messagePublisher.publish(EXCHANGES.EVENTS, poisonEvent, {
      routingKey: ROUTING_KEYS.PAYMENT.FAILED, // Route to payment queue
      messageId: eventId,
      aggregateId,
    });

    return {
      message: 'Poison message published to RabbitMQ',
      eventId,
      aggregateId,
      expectedFlow: [
        '1. Consumer receives message',
        '2. Consumer throws error (attempt 1/3)',
        '3. Message retried after ~1s (attempt 2/3)',
        '4. Message retried after ~2s (attempt 3/3)',
        '5. Message rejected and sent to DLQ',
      ],
      checkDlq: 'RabbitMQ Management UI -> Queues -> flexobo.dead-letter',
      note: 'Watch server logs for retry attempts',
    };
  }
}
