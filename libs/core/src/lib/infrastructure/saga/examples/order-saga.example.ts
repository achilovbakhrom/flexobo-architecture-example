/**
 * Example: Order Saga for E-commerce/Logistics
 *
 * This example demonstrates a complete order processing saga that:
 * 1. Reserves inventory
 * 2. Processes payment
 * 3. Reserves shipping capacity
 * 4. Confirms order
 *
 * If any step fails, all completed steps are compensated in reverse order.
 */

import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createSaga } from '../saga.builder';
import { ISagaRepository, SagaExecution } from '../saga.interface';
import { SAGA_REPOSITORY } from '../saga.module';

/**
 * Order context for saga execution
 */
export interface OrderContext {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  totalAmount: number;
  shippingAddress: string;

  // Step results
  reservationId?: string;
  paymentId?: string;
  shippingId?: string;
}

/**
 * Example services (these would be injected in real implementation)
 */
class InventoryService {
  async reserveInventory(items: OrderContext['items']): Promise<string> {
    // Call inventory microservice
    console.log('Reserving inventory:', items);
    return 'reservation-123';
  }

  async releaseReservation(reservationId: string): Promise<void> {
    // Compensate: release inventory reservation
    console.log('Releasing reservation:', reservationId);
  }
}

class PaymentService {
  async processPayment(customerId: string, amount: number): Promise<string> {
    // Call payment microservice
    console.log(`Processing payment: ${amount} for customer ${customerId}`);
    return 'payment-456';
  }

  async refundPayment(paymentId: string): Promise<void> {
    // Compensate: refund payment
    console.log('Refunding payment:', paymentId);
  }
}

class ShippingService {
  async reserveShipping(address: string): Promise<string> {
    // Call shipping/logistics microservice
    console.log('Reserving shipping to:', address);
    return 'shipping-789';
  }

  async cancelShipping(shippingId: string): Promise<void> {
    // Compensate: cancel shipping reservation
    console.log('Cancelling shipping:', shippingId);
  }
}

class OrderService {
  async confirmOrder(orderId: string): Promise<void> {
    // Update order status to confirmed
    console.log('Confirming order:', orderId);
  }

  async cancelOrder(orderId: string): Promise<void> {
    // Compensate: mark order as cancelled
    console.log('Cancelling order:', orderId);
  }
}

/**
 * Order Saga Orchestrator
 */
@Injectable()
export class OrderSagaOrchestrator {
  private readonly inventoryService = new InventoryService();
  private readonly paymentService = new PaymentService();
  private readonly shippingService = new ShippingService();
  private readonly orderService = new OrderService();

  constructor(
    @Inject(SAGA_REPOSITORY) private readonly repository: ISagaRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Execute order processing saga
   */
  async processOrder(
    context: OrderContext
  ): Promise<SagaExecution<OrderContext>> {
    const saga = createSaga<OrderContext>(this.repository, this.eventEmitter)
      .type('OrderProcessingSaga')

      // Step 1: Reserve Inventory
      .addStep(
        'ReserveInventory',
        async (ctx: OrderContext) => {
          const reservationId = await this.inventoryService.reserveInventory(
            ctx.items
          );
          ctx.reservationId = reservationId;
          return { reservationId };
        },
        async (ctx: OrderContext) => {
          if (ctx.reservationId) {
            await this.inventoryService.releaseReservation(ctx.reservationId);
          }
        },
        {
          timeout: 5000,
          retry: {
            maxAttempts: 3,
            backoff: 'exponential',
            initialDelay: 1000,
          },
        }
      )

      // Step 2: Process Payment
      .addStep(
        'ProcessPayment',
        async (ctx: OrderContext) => {
          const paymentId = await this.paymentService.processPayment(
            ctx.customerId,
            ctx.totalAmount
          );
          ctx.paymentId = paymentId;
          return { paymentId };
        },
        async (ctx: OrderContext) => {
          if (ctx.paymentId) {
            await this.paymentService.refundPayment(ctx.paymentId);
          }
        },
        {
          timeout: 10000,
          retry: {
            maxAttempts: 2,
            backoff: 'exponential',
            initialDelay: 2000,
          },
        }
      )

      // Step 3: Reserve Shipping (conditional - only if amount > 0)
      .addStep(
        'ReserveShipping',
        async (ctx: OrderContext) => {
          const shippingId = await this.shippingService.reserveShipping(
            ctx.shippingAddress
          );
          ctx.shippingId = shippingId;
          return { shippingId };
        },
        async (ctx: OrderContext) => {
          if (ctx.shippingId) {
            await this.shippingService.cancelShipping(ctx.shippingId);
          }
        },
        {
          condition: (ctx: OrderContext) => ctx.totalAmount > 0,
          timeout: 5000,
          retry: {
            maxAttempts: 3,
            backoff: 'linear',
            initialDelay: 1000,
          },
        }
      )

      // Step 4: Confirm Order
      .addStep(
        'ConfirmOrder',
        async (ctx: OrderContext) => {
          await this.orderService.confirmOrder(ctx.orderId);
          return { confirmed: true };
        },
        async (ctx: OrderContext) => {
          await this.orderService.cancelOrder(ctx.orderId);
        },
        {
          timeout: 3000,
        }
      )

      .build();

    return await saga.execute(context);
  }
}

/**
 * Usage Example:
 *
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { SagaModule } from '@flexobo/core';
 * import { OrderSagaOrchestrator } from './order-saga.orchestrator';
 *
 * @Module({
 *   imports: [
 *     SagaModule.forRoot(),
 *   ],
 *   providers: [OrderSagaOrchestrator],
 * })
 * export class OrderModule {}
 *
 * // In your service or controller:
 * async createOrder(orderData: OrderData) {
 *   const context: OrderContext = {
 *     orderId: 'order-123',
 *     customerId: 'customer-456',
 *     items: [
 *       { productId: 'prod-1', quantity: 2 },
 *       { productId: 'prod-2', quantity: 1 },
 *     ],
 *     totalAmount: 150.00,
 *     shippingAddress: '123 Main St, City, State',
 *   };
 *
 *   const result = await this.orderSagaOrchestrator.processOrder(context);
 *
 *   if (result.status === SagaStatus.COMPLETED) {
 *     return { success: true, orderId: context.orderId };
 *   } else {
 *     return { success: false, error: result.error };
 *   }
 * }
 * ```
 *
 * Event Handlers:
 *
 * ```typescript
 * import { OnEvent } from '@nestjs/event-emitter';
 *
 * @Injectable()
 * export class SagaEventHandler {
 *   @OnEvent('saga.started')
 *   handleSagaStarted(event: SagaStartedEvent) {
 *     console.log(`Saga ${event.sagaType} started:`, event.sagaId);
 *   }
 *
 *   @OnEvent('saga.completed')
 *   handleSagaCompleted(event: SagaCompletedEvent) {
 *     console.log(`Saga ${event.sagaType} completed:`, event.sagaId);
 *   }
 *
 *   @OnEvent('saga.failed')
 *   handleSagaFailed(event: SagaFailedEvent) {
 *     console.error(`Saga ${event.sagaType} failed:`, event.error);
 *     // Send notification, log to monitoring system, etc.
 *   }
 *
 *   @OnEvent('saga.step.failed')
 *   handleStepFailed(event: SagaStepFailedEvent) {
 *     console.error(`Step ${event.stepName} failed in saga ${event.sagaId}:`, event.error);
 *   }
 * }
 * ```
 */
