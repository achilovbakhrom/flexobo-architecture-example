export const EVENT_TYPES = {
  NOTIFICATION: {
    CREATED: 'NotificationCreated',
    MARKED_READ: 'NotificationMarkedRead',
  },
} as const;

export const ROUTING_KEYS = {
  NOTIFICATION: {
    CREATED: 'notification.created',
    MARKED_READ: 'notification.marked_read',
  },
  EXTERNAL: {
    PROJECTION_COMPLETED: 'projection.completed.*',
    SUBSCRIPTION_EXPIRED: 'subscription.expired',
    SUBSCRIPTION_RENEWED: 'subscription.renewed',
    ORDER_CONFIRMED: 'order.confirmed',
    ORDER_SHIPPED: 'order.shipped',
    PAYMENT_SUCCEEDED: 'payment.succeeded',
    PAYMENT_FAILED: 'payment.failed',
  },
  SSE: {
    USER: 'sse.user.*',
    BROADCAST: 'sse.broadcast',
  },
} as const;
