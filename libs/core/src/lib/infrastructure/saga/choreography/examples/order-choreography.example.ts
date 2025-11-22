/**
 * Order Processing Choreography Example
 *
 * This example demonstrates how to implement saga choreography pattern
 * for distributed order processing across multiple microservices.
 *
 * Unlike orchestration (centralized), choreography is event-driven and decentralized.
 * Each service listens for events and reacts independently, publishing new events
 * that other services can consume.
 *
 * Workflow:
 * 1. OrderService: OrderCreated → Inventory listens
 * 2. InventoryService: InventoryReserved → Payment listens
 * 3. PaymentService: PaymentCompleted → Shipping listens
 * 4. ShippingService: ShippingReserved → Order listens
 * 5. OrderService: OrderConfirmed
 *
 * Compensation (if any step fails):
 * - PaymentFailed → InventoryService releases reservation
 * - ShippingFailed → PaymentService refunds, InventoryService releases
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SagaParticipant } from '../saga-participant';
import { IEventBus, SagaEvent } from '../choreography.interface';

// ============================================================================
// Context Types
// ============================================================================

interface OrderData {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface InventoryReservation {
  reservationId: string;
  items: Array<{ productId: string; quantity: number }>;
}

interface PaymentResult {
  paymentId: string;
  amount: number;
}

interface ShippingReservation {
  shippingId: string;
  estimatedDelivery: Date;
}

// ============================================================================
// Order Service (Saga Initiator)
// ============================================================================

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly participant: SagaParticipant;

  constructor(eventBus: IEventBus) {
    this.participant = new SagaParticipant('OrderService', eventBus);
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for choreography
   */
  private setupEventHandlers(): void {
    // Listen for shipping reservation success
    this.participant.on<ShippingReservation>({
      eventType: 'ShippingReserved',
      handler: async (event: SagaEvent<ShippingReservation>): Promise<void> => {
        await this.confirmOrder(event);
      },
      successEventType: 'OrderConfirmed',
      compensationHandler: async (
        event: SagaEvent<ShippingReservation>
      ): Promise<void> => {
        await this.cancelOrder(event);
      },
    });

    // Listen for any failure events to trigger compensation
    this.participant.on({
      eventType: 'InventoryReservationFailed',
      handler: async (event: SagaEvent): Promise<void> => {
        await this.handleOrderFailure(event, 'Inventory unavailable');
      },
    });

    this.participant.on({
      eventType: 'PaymentFailed',
      handler: async (event: SagaEvent): Promise<void> => {
        await this.handleOrderFailure(event, 'Payment failed');
      },
    });

    this.participant.on({
      eventType: 'ShippingReservationFailed',
      handler: async (event: SagaEvent): Promise<void> => {
        await this.handleOrderFailure(event, 'Shipping unavailable');
      },
    });
  }

  /**
   * Create order and start choreography
   */
  async createOrder(orderData: OrderData): Promise<string> {
    const sagaId = randomUUID();

    this.logger.log(
      `Creating order ${orderData.orderId} with saga ID ${sagaId}`
    );

    // Publish OrderCreated event to start choreography
    await this.participant.emit<OrderData>({
      eventType: 'OrderCreated',
      payload: orderData,
      sagaId,
      timestamp: new Date(),
      metadata: { initiatedBy: 'OrderService' },
    });

    return sagaId;
  }

  /**
   * Confirm order after successful shipping reservation
   */
  private async confirmOrder(
    event: SagaEvent<ShippingReservation>
  ): Promise<void> {
    const { sagaId, payload } = event;

    this.logger.log(`Confirming order for saga ${sagaId}`);

    // Update order status in database
    // await this.orderRepository.updateStatus(orderId, 'CONFIRMED');

    this.logger.log(`Order confirmed with shipping ID ${payload.shippingId}`);
  }

  /**
   * Handle order failure (any step failed)
   */
  private async handleOrderFailure(
    event: SagaEvent,
    reason: string
  ): Promise<void> {
    const { sagaId } = event;

    this.logger.error(`Order failed for saga ${sagaId}: ${reason}`);

    // Update order status in database
    // await this.orderRepository.updateStatus(orderId, 'FAILED', reason);

    // Publish OrderFailed event
    await this.participant.emit({
      eventType: 'OrderFailed',
      payload: { reason },
      sagaId,
      timestamp: new Date(),
    });
  }

  /**
   * Cancel order (compensation)
   */
  private async cancelOrder(event: SagaEvent): Promise<void> {
    const { sagaId } = event;

    this.logger.log(`Cancelling order for saga ${sagaId}`);

    // Update order status in database
    // await this.orderRepository.updateStatus(orderId, 'CANCELLED');
  }

  async start(): Promise<void> {
    await this.participant.start();
  }

  async stop(): Promise<void> {
    await this.participant.stop();
  }
}

// ============================================================================
// Inventory Service
// ============================================================================

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly participant: SagaParticipant;

  constructor(eventBus: IEventBus) {
    this.participant = new SagaParticipant('InventoryService', eventBus);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for OrderCreated to reserve inventory
    this.participant.on<OrderData>({
      eventType: 'OrderCreated',
      handler: async (
        event: SagaEvent<OrderData>
      ): Promise<InventoryReservation> => {
        return await this.reserveInventory(event);
      },
      successEventType: 'InventoryReserved',
      failureEventType: 'InventoryReservationFailed',
      compensationHandler: async (
        event: SagaEvent<OrderData>
      ): Promise<void> => {
        await this.releaseInventory(event);
      },
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        initialDelay: 1000,
      },
    });

    // Listen for PaymentFailed to release inventory
    this.participant.on({
      eventType: 'PaymentFailed',
      handler: async (event: SagaEvent): Promise<void> => {
        await this.releaseInventory(event);
      },
    });

    // Listen for ShippingReservationFailed to release inventory
    this.participant.on({
      eventType: 'ShippingReservationFailed',
      handler: async (event: SagaEvent): Promise<void> => {
        await this.releaseInventory(event);
      },
    });
  }

  private async reserveInventory(
    event: SagaEvent<OrderData>
  ): Promise<InventoryReservation> {
    const { sagaId, payload } = event;

    this.logger.log(`Reserving inventory for saga ${sagaId}`);

    // Check inventory availability (commented out for example)
    // for (const item of payload.items) {
    //   const available = await this.inventoryRepository.checkAvailability(item.productId);
    //   if (available < item.quantity) {
    //     throw new Error(`Insufficient inventory for product ${item.productId}`);
    //   }
    // }

    // Reserve inventory
    const reservationId = randomUUID();
    // await this.inventoryRepository.reserve(reservationId, payload.items);

    this.logger.log(`Inventory reserved with ID ${reservationId}`);

    return {
      reservationId,
      items: payload.items,
    };
  }

  private async releaseInventory(event: SagaEvent): Promise<void> {
    const { sagaId } = event;

    this.logger.log(`Releasing inventory for saga ${sagaId}`);

    // Release inventory reservation
    // const reservation = await this.inventoryRepository.findBySagaId(sagaId);
    // if (reservation) {
    //   await this.inventoryRepository.release(reservation.reservationId);
    // }
  }

  async start(): Promise<void> {
    await this.participant.start();
  }

  async stop(): Promise<void> {
    await this.participant.stop();
  }
}

// ============================================================================
// Payment Service
// ============================================================================

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly participant: SagaParticipant;

  constructor(eventBus: IEventBus) {
    this.participant = new SagaParticipant('PaymentService', eventBus);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for InventoryReserved to process payment
    this.participant.on<InventoryReservation & { totalAmount: number }>({
      eventType: 'InventoryReserved',
      handler: async (
        event: SagaEvent<InventoryReservation & { totalAmount: number }>
      ): Promise<PaymentResult> => {
        return await this.processPayment(event);
      },
      successEventType: 'PaymentCompleted',
      failureEventType: 'PaymentFailed',
      compensationHandler: async (
        event: SagaEvent<InventoryReservation & { totalAmount: number }>
      ): Promise<void> => {
        await this.refundPayment(event);
      },
      retry: {
        maxAttempts: 2,
        backoff: 'linear',
        initialDelay: 2000,
      },
    });

    // Listen for ShippingReservationFailed to refund payment
    this.participant.on({
      eventType: 'ShippingReservationFailed',
      handler: async (event: SagaEvent): Promise<void> => {
        await this.refundPayment(event);
      },
    });
  }

  private async processPayment(
    event: SagaEvent<InventoryReservation & { totalAmount: number }>
  ): Promise<PaymentResult> {
    const { sagaId, payload } = event;

    this.logger.log(`Processing payment for saga ${sagaId}`);

    // Process payment through payment gateway
    const paymentId = randomUUID();
    // await this.paymentGateway.charge(customerId, payload.totalAmount);
    // await this.paymentRepository.save({ paymentId, sagaId, amount: payload.totalAmount });

    this.logger.log(`Payment processed with ID ${paymentId}`);

    return {
      paymentId,
      amount: payload.totalAmount || 0,
    };
  }

  private async refundPayment(event: SagaEvent): Promise<void> {
    const { sagaId } = event;

    this.logger.log(`Refunding payment for saga ${sagaId}`);

    // Refund payment
    // const payment = await this.paymentRepository.findBySagaId(sagaId);
    // if (payment) {
    //   await this.paymentGateway.refund(payment.paymentId);
    // }
  }

  async start(): Promise<void> {
    await this.participant.start();
  }

  async stop(): Promise<void> {
    await this.participant.stop();
  }
}

// ============================================================================
// Shipping Service
// ============================================================================

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly participant: SagaParticipant;

  constructor(eventBus: IEventBus) {
    this.participant = new SagaParticipant('ShippingService', eventBus);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for PaymentCompleted to reserve shipping
    this.participant.on<
      PaymentResult & { shippingAddress: OrderData['shippingAddress'] }
    >({
      eventType: 'PaymentCompleted',
      handler: async (
        event: SagaEvent<
          PaymentResult & { shippingAddress: OrderData['shippingAddress'] }
        >
      ): Promise<ShippingReservation> => {
        return await this.reserveShipping(event);
      },
      successEventType: 'ShippingReserved',
      failureEventType: 'ShippingReservationFailed',
      compensationHandler: async (
        event: SagaEvent<
          PaymentResult & { shippingAddress: OrderData['shippingAddress'] }
        >
      ): Promise<void> => {
        await this.cancelShipping(event);
      },
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        initialDelay: 1000,
      },
    });
  }

  private async reserveShipping(
    event: SagaEvent<
      PaymentResult & { shippingAddress: OrderData['shippingAddress'] }
    >
  ): Promise<ShippingReservation> {
    const { sagaId } = event;

    this.logger.log(`Reserving shipping for saga ${sagaId}`);

    // Reserve shipping slot
    const shippingId = randomUUID();
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // 5 days

    // await this.shippingRepository.reserve(shippingId, sagaId, payload.shippingAddress);

    this.logger.log(`Shipping reserved with ID ${shippingId}`);

    return {
      shippingId,
      estimatedDelivery,
    };
  }

  private async cancelShipping(event: SagaEvent): Promise<void> {
    const { sagaId } = event;

    this.logger.log(`Cancelling shipping for saga ${sagaId}`);

    // Cancel shipping reservation
    // const shipping = await this.shippingRepository.findBySagaId(sagaId);
    // if (shipping) {
    //   await this.shippingRepository.cancel(shipping.shippingId);
    // }
  }

  async start(): Promise<void> {
    await this.participant.start();
  }

  async stop(): Promise<void> {
    await this.participant.stop();
  }
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example: Setting up choreography in main application
 *
 * ```typescript
 * import { ChoreographyModule } from '@your-org/core';
 *
 * @Module({
 *   imports: [
 *     ChoreographyModule.forRoot({
 *       eventBus: 'rabbitmq',
 *       rabbitMQUrl: 'amqp://localhost:5672',
 *       queuePrefix: 'order-saga',
 *     }),
 *   ],
 *   providers: [
 *     OrderService,
 *     InventoryService,
 *     PaymentService,
 *     ShippingService,
 *   ],
 * })
 * export class OrderModule {}
 *
 * // In a controller
 * @Controller('orders')
 * export class OrderController {
 *   constructor(private readonly orderService: OrderService) {}
 *
 *   @Post()
 *   async createOrder(@Body() orderData: OrderData) {
 *     const sagaId = await this.orderService.createOrder(orderData);
 *     return { sagaId, message: 'Order processing started' };
 *   }
 * }
 * ```
 *
 * Event Flow:
 * 1. POST /orders → OrderService.createOrder()
 * 2. OrderService emits "OrderCreated"
 * 3. InventoryService handles "OrderCreated" → emits "InventoryReserved"
 * 4. PaymentService handles "InventoryReserved" → emits "PaymentCompleted"
 * 5. ShippingService handles "PaymentCompleted" → emits "ShippingReserved"
 * 6. OrderService handles "ShippingReserved" → emits "OrderConfirmed"
 *
 * Compensation Flow (e.g., payment fails):
 * 1. PaymentService fails → emits "PaymentFailed"
 * 2. InventoryService handles "PaymentFailed" → releases reservation
 * 3. OrderService handles "PaymentFailed" → marks order as failed
 *
 * Key Differences from Orchestration:
 * - No central coordinator (SagaOrchestrator)
 * - Each service is autonomous and reacts to events
 * - Services don't know about each other (loose coupling)
 * - Harder to track overall state (distributed)
 * - Better for simple linear workflows
 * - More resilient (no single point of failure)
 */
