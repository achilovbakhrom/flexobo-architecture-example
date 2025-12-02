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
    ALL: 'user.*',
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
  CHAT: {
    ROOM: {
      CREATED: 'chat.room.created',
      PARTICIPANT_ADDED: 'chat.room.participant_added',
      PARTICIPANT_REMOVED: 'chat.room.participant_removed',
      MESSAGE_ADDED: 'chat.room.message_added',
      MARKED_AS_READ: 'chat.room.marked_as_read',
      ARCHIVED: 'chat.room.archived',
      DELETED: 'chat.room.deleted',
      TRANSLATION_SETTINGS_UPDATED: 'chat.room.translation_settings_updated',
      ALL: 'chat.room.*',
    },
    MESSAGE: {
      SENT: 'chat.message.sent',
      EDITED: 'chat.message.edited',
      DELETED: 'chat.message.deleted',
      MARKED_AS_READ: 'chat.message.marked_as_read',
      TRANSLATION_ADDED: 'chat.message.translation_added',
      ALL: 'chat.message.*',
    },
    ALL: 'chat.#',
  },
  FILE: {
    UPLOADED: 'file.uploaded',
    DELETED: 'file.deleted',
    CHAT_FILE_UPLOADED: 'chat.file.uploaded',
    ALL: 'file.*',
  },
  BID: {
    CREATED: 'bid.created',
    UPDATED: 'bid.updated',
    CANCELLED: 'bid.cancelled',
    EXPIRED: 'bid.expired',
    ALL: 'bid.*',
  },
  LOAD: {
    CREATED: 'load.created',
    UPDATED: 'load.updated',
    DELETED: 'load.deleted',
    STATUS_CHANGED: 'load.status_changed',
    ALL: 'load.*',
  },
  TRANSPORT: {
    CREATED: 'transport.created',
    UPDATED: 'transport.updated',
    DELETED: 'transport.deleted',
    ALL: 'transport.*',
  },
  BOOKING: {
    CREATED: 'booking.created',
    STATUS_CHANGED: 'booking.status_changed',
    CANCELLED: 'booking.cancelled',
    COMPLETED: 'booking.completed',
    ALL: 'booking.*',
  },
  DEAD_LETTER: {
    ALL: '#',
  },
} as const;

export type OrderRoutingKey =
  (typeof ROUTING_KEYS.ORDER)[keyof typeof ROUTING_KEYS.ORDER];
export type UserRoutingKey =
  (typeof ROUTING_KEYS.USER)[keyof typeof ROUTING_KEYS.USER];
export type PaymentRoutingKey =
  (typeof ROUTING_KEYS.PAYMENT)[keyof typeof ROUTING_KEYS.PAYMENT];
export type ProductRoutingKey =
  (typeof ROUTING_KEYS.PRODUCT)[keyof typeof ROUTING_KEYS.PRODUCT];
export type InventoryRoutingKey =
  (typeof ROUTING_KEYS.INVENTORY)[keyof typeof ROUTING_KEYS.INVENTORY];
export type FileRoutingKey =
  (typeof ROUTING_KEYS.FILE)[keyof typeof ROUTING_KEYS.FILE];
export type BidRoutingKey =
  (typeof ROUTING_KEYS.BID)[keyof typeof ROUTING_KEYS.BID];
export type LoadRoutingKey =
  (typeof ROUTING_KEYS.LOAD)[keyof typeof ROUTING_KEYS.LOAD];
export type TransportRoutingKey =
  (typeof ROUTING_KEYS.TRANSPORT)[keyof typeof ROUTING_KEYS.TRANSPORT];
export type BookingRoutingKey =
  (typeof ROUTING_KEYS.BOOKING)[keyof typeof ROUTING_KEYS.BOOKING];
