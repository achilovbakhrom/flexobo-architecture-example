/**
 * Ports Layer
 *
 * Ports define the boundaries of the hexagonal architecture.
 * These are secondary/driven ports (how our app interacts with external systems).
 */

export * from './order.repository.port';
export * from './order-read-model.port';
export * from './product.repository.port';
export * from './payment.repository.port';
export * from './order-history.repository.port';
