import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandBus } from '@flexobo/core';
import { RefundPaymentCommand } from '../commands/payment.commands';
import {
  ORDER_EVENTS,
  PAYMENT_EVENTS,
} from '../../domain/events/event.constants';

interface LocalEventData {
  aggregateId: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
}

interface SagaState {
  orderId: string;
  status:
    | 'STARTED'
    | 'INVENTORY_RESERVED'
    | 'PAYMENT_PROCESSING'
    | 'PAYMENT_COMPLETED'
    | 'SHIPPED'
    | 'CANCELLED'
    | 'FAILED';
  inventoryReserved: boolean;
  paymentId?: string;
  paymentCompleted: boolean;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrderFulfillmentSaga {
  private readonly logger = new Logger(OrderFulfillmentSaga.name);

  private readonly sagaStates = new Map<string, SagaState>();

  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(ORDER_EVENTS.CONFIRMED)
  async onOrderConfirmed(event: LocalEventData): Promise<void> {
    const orderId = event.aggregateId;

    this.logger.log(
      `[SAGA] Starting order fulfillment saga for order ${orderId}`
    );

    this.sagaStates.set(orderId, {
      orderId,
      status: 'STARTED',
      inventoryReserved: false,
      paymentCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(
      `[SAGA] Order ${orderId}: Waiting for inventory reservation from Admin Panel`
    );
  }

  @OnEvent(ORDER_EVENTS.INVENTORY_RESERVED)
  async onInventoryReserved(event: LocalEventData): Promise<void> {
    const orderId = event.aggregateId;
    const state = this.sagaStates.get(orderId);

    if (!state) {
      this.logger.warn(`[SAGA] No saga state found for order ${orderId}`);
      return;
    }

    this.logger.log(`[SAGA] Order ${orderId}: Inventory reserved successfully`);

    state.status = 'INVENTORY_RESERVED';
    state.inventoryReserved = true;
    state.updatedAt = new Date();

    this.logger.log(`[SAGA] Order ${orderId}: Ready for payment processing`);
  }

  @OnEvent(ORDER_EVENTS.INVENTORY_FAILED)
  async onInventoryFailed(event: LocalEventData): Promise<void> {
    const orderId = event.aggregateId;
    const state = this.sagaStates.get(orderId);

    if (!state) {
      this.logger.warn(`[SAGA] No saga state found for order ${orderId}`);
      return;
    }

    const reason = (event.data['reason'] as string) || 'Insufficient stock';
    const failedProducts = event.data['failedProductIds'] as string[];

    this.logger.warn(
      `[SAGA] Order ${orderId}: Inventory reservation failed - ${reason}. Failed products: ${failedProducts?.join(
        ', '
      )}`
    );

    state.status = 'FAILED';
    state.failureReason = reason;
    state.updatedAt = new Date();
  }

  @OnEvent(PAYMENT_EVENTS.COMPLETED)
  async onPaymentCompleted(event: LocalEventData): Promise<void> {
    const paymentId = event.aggregateId;
    const orderId = event.data['orderId'] as string;

    if (!orderId) {
      this.logger.warn(
        `[SAGA] Payment ${paymentId} completed but no orderId found`
      );
      return;
    }

    const state = this.sagaStates.get(orderId);
    if (!state) {
      this.logger.debug(
        `[SAGA] No saga state for order ${orderId}, payment ${paymentId}`
      );
      return;
    }

    this.logger.log(`[SAGA] Order ${orderId}: Payment ${paymentId} completed`);

    state.status = 'PAYMENT_COMPLETED';
    state.paymentId = paymentId;
    state.paymentCompleted = true;
    state.updatedAt = new Date();

    this.logger.log(`[SAGA] Order ${orderId}: Ready for shipping`);
  }

  @OnEvent(ORDER_EVENTS.SHIPPED)
  async onOrderShipped(event: LocalEventData): Promise<void> {
    const orderId = event.aggregateId;
    const state = this.sagaStates.get(orderId);

    if (!state) {
      this.logger.debug(`[SAGA] No saga state for order ${orderId}`);
      return;
    }

    this.logger.log(`[SAGA] Order ${orderId}: Shipped successfully`);

    state.status = 'SHIPPED';
    state.updatedAt = new Date();

    setTimeout(() => {
      this.sagaStates.delete(orderId);
      this.logger.debug(`[SAGA] Cleaned up saga state for order ${orderId}`);
    }, 60000);
  }

  @OnEvent(ORDER_EVENTS.CANCELLED)
  async onOrderCancelled(event: LocalEventData): Promise<void> {
    const orderId = event.aggregateId;
    const reason = (event.data['reason'] as string) || 'Order cancelled';
    const state = this.sagaStates.get(orderId);

    this.logger.log(`[SAGA] Order ${orderId}: Cancelled - ${reason}`);

    if (!state) {
      this.logger.debug(`[SAGA] No saga state for cancelled order ${orderId}`);
      return;
    }

    state.status = 'CANCELLED';
    state.updatedAt = new Date();

    if (state.paymentCompleted && state.paymentId) {
      this.logger.log(
        `[SAGA] Order ${orderId}: Initiating payment refund for ${state.paymentId}`
      );
      try {
        const refundCommand = new RefundPaymentCommand(
          state.paymentId,
          0,
          reason
        );
        await this.commandBus.execute(refundCommand);
        this.logger.log(`[SAGA] Order ${orderId}: Payment refund initiated`);
      } catch (error) {
        this.logger.error(
          `[SAGA] Order ${orderId}: Failed to refund payment`,
          error
        );
      }
    }

    setTimeout(() => {
      this.sagaStates.delete(orderId);
      this.logger.debug(
        `[SAGA] Cleaned up saga state for cancelled order ${orderId}`
      );
    }, 60000);
  }

  getSagaState(orderId: string): SagaState | undefined {
    return this.sagaStates.get(orderId);
  }

  getActiveSagas(): SagaState[] {
    return Array.from(this.sagaStates.values());
  }
}
