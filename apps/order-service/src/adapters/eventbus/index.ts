/**
 * Event Bus Adapters
 *
 * Event handlers that subscribe to RabbitMQ and:
 * - Execute commands (event → command orchestration)
 * - Update read models (projections)
 */

// Event → Command handlers
export { OnPaymentEventsHandler } from './on-payment-events.handler';
export { OnOrderEventsHandler } from './on-order-events.handler';

// Utility consumers
export { OrderHistoryEventConsumer } from './order-history-event.consumer';
export { DeadLetterConsumer } from './dead-letter.consumer';

// Projections (read model updaters)
export * from './projection';
