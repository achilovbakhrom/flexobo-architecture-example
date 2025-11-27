/**
 * Event Constants
 *
 * Centralized event name definitions for type safety and consistency.
 * These are used for local event emitter subscriptions and RabbitMQ routing.
 */

// ============================================================
// Inventory Events (Local)
// ============================================================
export const INVENTORY_EVENTS = {
  /** Inventory item was created */
  CREATED: 'inventory.created',
  /** Stock was added to inventory */
  STOCK_ADDED: 'inventory.stockadded',
  /** Stock was reserved for an order */
  RESERVED: 'inventory.reserved',
  /** Stock reservation failed */
  RESERVATION_FAILED: 'inventory.reservation_failed',
  /** Stock reservation was confirmed */
  RESERVATION_CONFIRMED: 'inventory.reservation_confirmed',
  /** Stock reservation was released */
  RESERVATION_RELEASED: 'inventory.reservation_released',
  /** Order was shipped (for inventory tracking) */
  ORDER_SHIPPED: 'inventory.order_shipped',
} as const;

// ============================================================
// Order Events (from Order Service via RabbitMQ)
// ============================================================
export const ORDER_EVENTS = {
  /** Order was confirmed */
  CONFIRMED: 'order.confirmed',
  /** Order was cancelled */
  CANCELLED: 'order.cancelled',
  /** Order was shipped */
  SHIPPED: 'order.shipped',
} as const;

// ============================================================
// RabbitMQ Routing Keys
// ============================================================
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

// ============================================================
// Event Types (for payload.type field)
// ============================================================
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

// Type exports for type safety
export type InventoryEventType = (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];
export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];
