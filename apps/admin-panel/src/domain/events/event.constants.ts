/**
 * Event Constants
 *
 * Centralized event name definitions for type safety and consistency.
 * These are used for local event emitter subscriptions and RabbitMQ routing.
 */

export const INVENTORY_EVENTS = {
  CREATED: 'inventory.created',
  STOCK_ADDED: 'inventory.stockadded',
  RESERVED: 'inventory.reserved',
  RESERVATION_FAILED: 'inventory.reservation_failed',
  RESERVATION_CONFIRMED: 'inventory.reservation_confirmed',
  RESERVATION_RELEASED: 'inventory.reservation_released',
  ORDER_SHIPPED: 'inventory.order_shipped',
} as const;

export const ORDER_EVENTS = {
  CONFIRMED: 'order.confirmed',
  CANCELLED: 'order.cancelled',
  SHIPPED: 'order.shipped',
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

export type InventoryEventType = (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];
export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];
