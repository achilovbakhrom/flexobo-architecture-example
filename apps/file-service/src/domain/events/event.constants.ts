/**
 * File Service Event Constants
 *
 * These event types are specific to the file-service domain.
 */

export const FILE_EVENT_TYPES = {
  UPLOADED: 'file.uploaded',
  DELETED: 'file.deleted',
  CHAT_FILE_UPLOADED: 'chat.file.uploaded',
} as const;

export type FileEventType =
  (typeof FILE_EVENT_TYPES)[keyof typeof FILE_EVENT_TYPES];

/**
 * File Service Routing Keys for RabbitMQ
 */
export const FILE_ROUTING_KEYS = {
  ALL: 'file.#',
  UPLOADED: 'file.uploaded',
  DELETED: 'file.deleted',
  CHAT_FILE_UPLOADED: 'chat.file.uploaded',
} as const;

export type FileRoutingKey =
  (typeof FILE_ROUTING_KEYS)[keyof typeof FILE_ROUTING_KEYS];

/**
 * File Service Queue Names
 *
 * Service-specific queues for consuming events.
 */
export const QUEUES = {
  FILE: {
    PROJECTION: 'file-service.file-projection',
  },
  DEAD_LETTER: 'file-service.dead-letter',
} as const;

/**
 * Exchange configuration
 */
export const EXCHANGES = {
  EVENTS: 'flexobo.events',
  DEAD_LETTER: 'flexobo.dlx',
} as const;
