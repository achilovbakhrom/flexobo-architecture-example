/**
 * RabbitMQ Exchanges
 *
 * Shared exchange names used across all microservices.
 */
export const EXCHANGES = {
  EVENTS: 'flexobo.events',
  DEAD_LETTER: 'flexobo.dlx',
} as const;
