/**
 * Queue Adapters
 *
 * Event consumers that listen to message queues (RabbitMQ, Kafka, etc.)
 * and update read models or trigger side effects.
 *
 * Currently uses NestJS EventEmitter for local development.
 * In production, these would be replaced with actual queue consumers:
 * - RabbitMQ: @nestjs/microservices with RabbitMQ transport
 * - Kafka: @nestjs/microservices with Kafka transport
 * - AWS SQS: Custom consumer implementation
 */

export * from './order-event.consumer';
export * from './payment-event.consumer';
export * from './order-history-event.consumer';
export * from './product-event.consumer';
