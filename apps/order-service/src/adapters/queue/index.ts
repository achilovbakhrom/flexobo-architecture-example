/**
 * Queue Adapters
 *
 * Event consumers that listen to message queues (RabbitMQ)
 * and update read models or trigger side effects.
 */

export * from './order-event.consumer';
export * from './payment-event.consumer';
export * from './order-history-event.consumer';
export * from './product-event.consumer';
export * from './dead-letter.consumer';
