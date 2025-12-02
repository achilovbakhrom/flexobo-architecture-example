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
    },
    MESSAGE: {
      SENT: 'chat.message.sent',
      EDITED: 'chat.message.edited',
      DELETED: 'chat.message.deleted',
      MARKED_AS_READ: 'chat.message.marked_as_read',
      TRANSLATION_ADDED: 'chat.message.translation_added',
    },
  },
  FILE: {
    UPLOADED: 'file.uploaded',
    DELETED: 'file.deleted',
    CHAT_FILE_UPLOADED: 'chat.file.uploaded',
  },
  BID: {
    CREATED: 'bid.created',
    UPDATED: 'bid.updated',
    CANCELLED: 'bid.cancelled',
    EXPIRED: 'bid.expired',
  },
  LOAD: {
    CREATED: 'load.created',
    UPDATED: 'load.updated',
    DELETED: 'load.deleted',
    STATUS_CHANGED: 'load.status_changed',
  },
  TRANSPORT: {
    CREATED: 'transport.created',
    UPDATED: 'transport.updated',
    DELETED: 'transport.deleted',
  },
  BOOKING: {
    CREATED: 'booking.created',
    STATUS_CHANGED: 'booking.status_changed',
    CANCELLED: 'booking.cancelled',
    COMPLETED: 'booking.completed',
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
export type FileEventTypes =
  (typeof EVENT_TYPES.FILE)[keyof typeof EVENT_TYPES.FILE];
export type BidEventTypes =
  (typeof EVENT_TYPES.BID)[keyof typeof EVENT_TYPES.BID];
export type LoadEventTypes =
  (typeof EVENT_TYPES.LOAD)[keyof typeof EVENT_TYPES.LOAD];
export type TransportEventTypes =
  (typeof EVENT_TYPES.TRANSPORT)[keyof typeof EVENT_TYPES.TRANSPORT];
export type BookingEventTypes =
  (typeof EVENT_TYPES.BOOKING)[keyof typeof EVENT_TYPES.BOOKING];
