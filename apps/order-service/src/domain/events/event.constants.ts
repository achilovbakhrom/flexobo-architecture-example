export const EXCHANGES = {
  EVENTS: 'flexobo.events',
  DEAD_LETTER: 'flexobo.dlx',
} as const;

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

export const ROUTING_KEYS = {
  ORDER: {
    CREATED: 'order.created',
    ITEM_ADDED: 'order.item_added',
    CONFIRMED: 'order.confirmed',
    CANCELLED: 'order.cancelled',
    SHIPPED: 'order.shipped',
    INVENTORY_RESERVED: 'order.inventory_reserved',
    INVENTORY_FAILED: 'order.inventory_failed',
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
  },
  DEAD_LETTER: {
    ALL: '#',
  },
} as const;

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

export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];
export type PaymentEventType =
  (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];
export type ProductEventType =
  (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];
export type InventoryEventType =
  (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];
