// Re-export shared event contracts from shared-kernel
export {
  EVENT_TYPES,
  ROUTING_KEYS,
  EXCHANGES,
  type OrderEventTypes,
  type PaymentEventTypes,
  type ProductEventTypes,
  type InventoryEventTypes,
  type OrderRoutingKey,
  type PaymentRoutingKey,
  type ProductRoutingKey,
  type InventoryRoutingKey,
} from '@flexobo/shared-kernel';

/**
 * Service-specific Queue Names
 *
 * These are specific to order-service and should not be shared.
 * Each microservice defines its own queue names for consuming events.
 */
export const QUEUES = {
  ORDER: {
    PROJECTION: 'order-service.order-projection',
    HISTORY: 'order-service.order-history',
    HANDLER: 'order-service.on-order-events',
  },
  PRODUCT: {
    PROJECTION: 'order-service.product-projection',
  },
  PAYMENT: {
    PROJECTION: 'order-service.payment-projection',
    HANDLER: 'order-service.on-payment-events',
  },
  INVENTORY: {
    HANDLER: 'order-service.on-inventory-events',
  },
  DEAD_LETTER: 'order-service.dead-letter',
} as const;

// Legacy exports for backwards compatibility - deprecated, use EVENT_TYPES instead
export const ORDER_EVENTS = {
  CREATED: 'order.created',
  ITEM_ADDED: 'order.item_added',
  CONFIRMED: 'order.confirmed',
  CANCELLED: 'order.cancelled',
  SHIPPED: 'order.shipped',
  INVENTORY_RESERVED: 'order.inventory_reserved',
  INVENTORY_FAILED: 'order.inventory_failed',
  PAID: 'order.paid',
  PAYMENT_FAILED: 'order.payment_failed',
} as const;

export const PAYMENT_EVENTS = {
  CREATED: 'payment.created',
  PROCESSING: 'payment.processing',
  COMPLETED: 'payment.completed',
  FAILED: 'payment.failed',
  REFUNDED: 'payment.refunded',
} as const;

export const PRODUCT_EVENTS = {
  CREATED: 'product.created',
  UPDATED: 'product.updated',
  STOCK_UPDATED: 'product.stock_updated',
  ACTIVATED: 'product.activated',
  DEACTIVATED: 'product.deactivated',
  DELETED: 'product.deleted',
} as const;

export const INVENTORY_EVENTS = {
  RESERVED: 'inventory.reserved',
  RESERVATION_FAILED: 'inventory.reservation_failed',
} as const;

export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];
export type PaymentEventType =
  (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];
export type ProductEventType =
  (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];
export type InventoryEventType =
  (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];
