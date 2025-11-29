/**
 * RabbitMQ configuration interface
 */
export interface RabbitMQConfig {
  /**
   * RabbitMQ connection URL (amqp://user:password@host:port/vhost)
   * Defaults to amqp://guest:guest@localhost:5672 if not provided
   */
  url?: string;

  /**
   * Connection options
   */
  connectionOptions?: {
    heartbeat?: number;
    timeout?: number;
    locale?: string;
  };

  /**
   * Channel pool configuration
   */
  channelPool?: {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    idleTimeoutMillis?: number;
  };

  /**
   * Reconnection settings
   */
  reconnect?: {
    enabled?: boolean;
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    multiplier?: number;
  };

  /**
   * Exchange configuration
   */
  exchanges?: ExchangeConfig[];

  /**
   * Queue configuration
   */
  queues?: QueueConfig[];

  /**
   * Default publish options
   */
  defaultPublishOptions?: {
    persistent?: boolean;
    contentType?: string;
    priority?: number;
  };

  /**
   * Enable consistent hashing for event ordering
   */
  consistentHashing?: {
    enabled?: boolean;
    hashHeader?: string; // Default: 'x-hash-key'
  };

  /**
   * Dead letter configuration
   */
  deadLetter?: {
    exchange?: string;
    queue?: string;
    ttl?: number; // Time to live in milliseconds
  };

  /**
   * Logging configuration
   */
  logging?: {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Exchange configuration
 */
export interface ExchangeConfig {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers' | 'x-consistent-hash';
  durable?: boolean;
  autoDelete?: boolean;
  internal?: boolean;
  alternateExchange?: string;
  arguments?: Record<string, unknown>;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  name: string;
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  messageTtl?: number;
  maxLength?: number;
  maxLengthBytes?: number;
  maxPriority?: number;
  arguments?: Record<string, unknown>;
  bindings?: QueueBinding[];
}

/**
 * Queue binding configuration
 */
export interface QueueBinding {
  exchange: string;
  routingKey?: string;
  arguments?: Record<string, unknown>;
}

/**
 * Default RabbitMQ configuration
 */
export const DEFAULT_RABBITMQ_CONFIG: Partial<RabbitMQConfig> = {
  url: 'amqp://guest:guest@localhost:5672',
  connectionOptions: {
    heartbeat: 60,
    timeout: 10000,
  },
  channelPool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  },
  reconnect: {
    enabled: true,
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
  },
  defaultPublishOptions: {
    persistent: true,
    contentType: 'application/json',
    priority: 0,
  },
  consistentHashing: {
    enabled: true,
    hashHeader: 'x-hash-key',
  },
  deadLetter: {
    exchange: 'dlx',
    queue: 'dlq',
    ttl: 86400000, // 24 hours
  },
  logging: {
    enabled: true,
    level: 'info',
  },
};
