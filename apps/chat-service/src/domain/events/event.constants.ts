// Re-export shared event contracts from shared-kernel
export { EVENT_TYPES, ROUTING_KEYS, EXCHANGES } from '@flexobo/shared-kernel';

/**
 * Service-specific Queue Names
 *
 * These are specific to chat-service and should not be shared.
 * Each microservice defines its own queue names for consuming events.
 */
export const QUEUES = {
  CHAT_ROOM: {
    PROJECTION: 'chat-service.room-projection',
    HANDLER: 'chat-service.on-room-events',
  },
  CHAT_MESSAGE: {
    PROJECTION: 'chat-service.message-projection',
    HANDLER: 'chat-service.on-message-events',
  },
  EXTERNAL_EVENTS: {
    PROJECTION: 'chat-service.external-events',
  },
  DEAD_LETTER: 'chat-service.dead-letter',
} as const;
