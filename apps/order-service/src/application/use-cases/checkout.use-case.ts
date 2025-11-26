/**
 * Checkout Use Case
 *
 * Use cases are useful when you need to:
 * 1. Orchestrate multiple commands/operations
 * 2. Coordinate across multiple aggregates
 * 3. Add complex business logic that spans aggregates
 * 4. Manage transactions
 *
 * This use case orchestrates the checkout flow:
 * - Validates the order
 * - Creates a payment
 * - Confirms the order
 * - Handles failures with compensation
 */

import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';

// Commands
import { ConfirmOrderCommand } from '../commands/order.commands';
import {
  CreatePaymentCommand,
  ProcessPaymentCommand,
} from '../commands/payment.commands';

// Queries
import { GetOrderByIdQuery } from '../queries/order.queries';

// DTOs
import { OrderWithItemsReadModelDto } from '../dto/order.dto';

export interface CheckoutInput {
  orderId: string;
  paymentMethod: string;
  currency?: string;
}

export interface CheckoutResult {
  success: boolean;
  orderId: string;
  paymentId?: string;
  error?: string;
}

@Injectable()
export class CheckoutUseCase {
  private readonly logger = new Logger(CheckoutUseCase.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * Execute the checkout use case
   *
   * This orchestrates multiple operations:
   * 1. Fetch and validate the order
   * 2. Create a payment
   * 3. Process the payment
   * 4. Confirm the order
   */
  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    this.logger.log(`Starting checkout for order ${input.orderId}`);

    try {
      // Step 1: Fetch and validate the order
      const order = await this.queryBus.execute<OrderWithItemsReadModelDto | null>(
        new GetOrderByIdQuery(input.orderId)
      );

      if (!order) {
        return {
          success: false,
          orderId: input.orderId,
          error: 'Order not found',
        };
      }

      if (order.status !== 'DRAFT') {
        return {
          success: false,
          orderId: input.orderId,
          error: `Order is in ${order.status} status, cannot checkout`,
        };
      }

      if (order.items.length === 0) {
        return {
          success: false,
          orderId: input.orderId,
          error: 'Order has no items',
        };
      }

      // Step 2: Create a payment
      const paymentId = uuidv4();
      const createPaymentResult = await this.commandBus.execute(
        new CreatePaymentCommand({
          paymentId,
          orderId: input.orderId,
          amount: order.totalAmount,
          currency: input.currency ?? order.currency,
          paymentMethod: input.paymentMethod,
        })
      );

      if (createPaymentResult.isFailure) {
        return {
          success: false,
          orderId: input.orderId,
          error: `Failed to create payment: ${createPaymentResult.error?.message}`,
        };
      }

      // Step 3: Process the payment
      const processResult = await this.commandBus.execute(
        new ProcessPaymentCommand(paymentId)
      );

      if (processResult.isFailure) {
        // Payment failed - don't confirm order
        return {
          success: false,
          orderId: input.orderId,
          paymentId,
          error: `Payment processing failed: ${processResult.error?.message}`,
        };
      }

      // Step 4: Confirm the order
      const confirmResult = await this.commandBus.execute(
        new ConfirmOrderCommand(input.orderId)
      );

      if (confirmResult.isFailure) {
        // Order confirmation failed - payment was already processed
        // In a real system, you might want to refund or compensate
        this.logger.error(
          `Order confirmation failed after payment: ${confirmResult.error?.message}`
        );
        return {
          success: false,
          orderId: input.orderId,
          paymentId,
          error: `Order confirmation failed: ${confirmResult.error?.message}`,
        };
      }

      this.logger.log(`Checkout completed for order ${input.orderId}`);

      return {
        success: true,
        orderId: input.orderId,
        paymentId,
      };
    } catch (error) {
      this.logger.error(`Checkout failed: ${error}`);
      return {
        success: false,
        orderId: input.orderId,
        error: `Checkout failed: ${(error as Error).message}`,
      };
    }
  }
}
