export const ORDER_EVENTS = {
  CREATED: 'order.created',
  ITEM_ADDED: 'order.item_added',
  CONFIRMED: 'order.confirmed',
  CANCELLED: 'order.cancelled',
  SHIPPED: 'order.shipped',
  INVENTORY_RESERVED: 'order.inventory_reserved',
  INVENTORY_FAILED: 'order.inventory_failed',
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

export const ROUTING_KEYS = {
  ORDER: {
    CONFIRMED: 'order.confirmed',
    CANCELLED: 'order.cancelled',
    SHIPPED: 'order.shipped',
  },
  INVENTORY: {
    RESERVED: 'inventory.reserved',
    RESERVATION_FAILED: 'inventory.reservation_failed',
  },
} as const;

export const EVENT_TYPES = {
  ORDER: {
    CONFIRMED: 'OrderConfirmed',
    CANCELLED: 'OrderCancelled',
    SHIPPED: 'OrderShipped',
  },
  INVENTORY: {
    RESERVED: 'InventoryReserved',
    RESERVATION_FAILED: 'InventoryReservationFailed',
  },
} as const;

export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];
export type PaymentEventType =
  (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];
export type ProductEventType =
  (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];
export type InventoryEventType =
  (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];
