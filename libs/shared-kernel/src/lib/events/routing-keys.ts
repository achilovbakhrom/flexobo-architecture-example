/**
 * Event Routing Keys
 *
 * These are the routing keys used for publishing and subscribing to events
 * via RabbitMQ. Services use these to subscribe to specific event types.
 */
export const ROUTING_KEYS = {
  ORDER: {
    CREATED: 'order.created',
    ITEM_ADDED: 'order.item_added',
    CONFIRMED: 'order.confirmed',
    CANCELLED: 'order.cancelled',
    SHIPPED: 'order.shipped',
    INVENTORY_RESERVED: 'order.inventory_reserved',
    INVENTORY_FAILED: 'order.inventory_failed',
    PAID: 'order.paid',
    PAYMENT_FAILED: 'order.payment_failed',
    ALL: 'order.*',
  },
  PAYMENT: {
    CREATED: 'payment.created',
    PROCESSING: 'payment.processing',
    COMPLETED: 'payment.completed',
    FAILED: 'payment.failed',
    REFUNDED: 'payment.refunded',
    ALL: 'payment.*',
  },
  PRODUCT: {
    CREATED: 'product.created',
    UPDATED: 'product.updated',
    STOCK_UPDATED: 'product.stock_updated',
    ACTIVATED: 'product.activated',
    DEACTIVATED: 'product.deactivated',
    DELETED: 'product.deleted',
    ALL: 'product.*',
  },
  INVENTORY: {
    RESERVED: 'inventory.reserved',
    RESERVATION_FAILED: 'inventory.reservation_failed',
    ALL: 'inventory.*',
  },
  DEAD_LETTER: {
    ALL: '#',
  },
} as const;

export type OrderRoutingKey =
  (typeof ROUTING_KEYS.ORDER)[keyof typeof ROUTING_KEYS.ORDER];
export type PaymentRoutingKey =
  (typeof ROUTING_KEYS.PAYMENT)[keyof typeof ROUTING_KEYS.PAYMENT];
export type ProductRoutingKey =
  (typeof ROUTING_KEYS.PRODUCT)[keyof typeof ROUTING_KEYS.PRODUCT];
export type InventoryRoutingKey =
  (typeof ROUTING_KEYS.INVENTORY)[keyof typeof ROUTING_KEYS.INVENTORY];
