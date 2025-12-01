// Re-export shared event contracts from shared-kernel
export {
  EVENT_TYPES,
  ROUTING_KEYS,
  EXCHANGES,
  type UserEventTypes,
  type UserRoutingKey,
} from '@flexobo/shared-kernel';

/**
 * Service-specific Queue Names
 *
 * These are specific to users-service and should not be shared.
 * Each microservice defines its own queue names for consuming events.
 */
export const QUEUES = {
  USER: {
    PROJECTION: 'users-service.user-projection',
    HANDLER: 'users-service.on-user-events',
  },
  DEAD_LETTER: 'users-service.dead-letter',
} as const;
