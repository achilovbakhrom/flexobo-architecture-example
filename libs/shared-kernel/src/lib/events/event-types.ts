/**
 * Domain Event Types
 *
 * These are the event type names used in event sourcing.
 * They identify the type of domain event stored and published.
 */
export const EVENT_TYPES = {
  ORDER: {
    CREATED: 'OrderCreated',
    ITEM_ADDED: 'OrderItemAdded',
    CONFIRMED: 'OrderConfirmed',
    CANCELLED: 'OrderCancelled',
    SHIPPED: 'OrderShipped',
    INVENTORY_RESERVED: 'OrderInventoryReserved',
    INVENTORY_FAILED: 'OrderInventoryFailed',
    PAID: 'OrderPaid',
    PAYMENT_FAILED: 'OrderPaymentFailed',
  },
  USER: {
    REGISTERED: 'user.registered',
    LOGGED_IN: 'user.logged_in',
    LOGGED_OUT: 'user.logged_out',
    PROFILE_UPDATED: 'user.profile_updated',
    PASSWORD_CHANGED: 'user.password_changed',
    PASSWORD_RESET: 'user.password_reset',
    TELEGRAM_LINKED: 'user.telegram_linked',
    ACTIVATED: 'user.activated',
    DEACTIVATED: 'user.deactivated',
  },
  PAYMENT: {
    CREATED: 'PaymentCreated',
    PROCESSING: 'PaymentProcessing',
    COMPLETED: 'PaymentCompleted',
    FAILED: 'PaymentFailed',
    REFUNDED: 'PaymentRefunded',
  },
  PRODUCT: {
    CREATED: 'ProductCreated',
    UPDATED: 'ProductUpdated',
    STOCK_UPDATED: 'ProductStockUpdated',
    ACTIVATED: 'ProductActivated',
    DEACTIVATED: 'ProductDeactivated',
    DELETED: 'ProductDeleted',
  },
  INVENTORY: {
    RESERVED: 'InventoryReserved',
    RESERVATION_FAILED: 'InventoryReservationFailed',
  },
} as const;

export type OrderEventTypes =
  (typeof EVENT_TYPES.ORDER)[keyof typeof EVENT_TYPES.ORDER];
export type UserEventTypes =
  (typeof EVENT_TYPES.USER)[keyof typeof EVENT_TYPES.USER];
export type PaymentEventTypes =
  (typeof EVENT_TYPES.PAYMENT)[keyof typeof EVENT_TYPES.PAYMENT];
export type ProductEventTypes =
  (typeof EVENT_TYPES.PRODUCT)[keyof typeof EVENT_TYPES.PRODUCT];
export type InventoryEventTypes =
  (typeof EVENT_TYPES.INVENTORY)[keyof typeof EVENT_TYPES.INVENTORY];
