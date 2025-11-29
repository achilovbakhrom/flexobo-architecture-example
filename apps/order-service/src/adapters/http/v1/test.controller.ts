/**
 * Test Controller for Error Simulation
 *
 * This controller is for demonstration/testing purposes only.
 * It simulates error scenarios to show how the system handles failures.
 *
 * Test types:
 * - Consumer errors (dlq/*) - errors in consumer, go to DLQ after retries
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
import {
  EXCHANGES,
  ROUTING_KEYS,
} from '../../../domain/events/event.constants';
import { MESSAGE_PUBLISHER, IMessagePublisher } from '@flexobo/core';

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
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher
  ) {}

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
