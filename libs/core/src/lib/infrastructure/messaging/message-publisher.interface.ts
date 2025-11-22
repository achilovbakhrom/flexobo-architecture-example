/**
 * Message publisher interface for abstracting message broker implementations
 * Supports both individual and batch publishing with metadata
 */
export interface IMessagePublisher {
  /**
   * Publish a single message to a topic/exchange
   * @param topic - The topic or exchange name
   * @param message - The message payload
   * @param metadata - Additional metadata (routing key, headers, etc.)
   * @returns Promise resolving to message ID or acknowledgment
   */
  publish(
    topic: string,
    message: unknown,
    metadata?: PublishMetadata
  ): Promise<string>;

  /**
   * Publish multiple messages in a batch
   * @param messages - Array of messages to publish
   * @returns Promise resolving to array of message IDs
   */
  publishBatch(messages: PublishMessage[]): Promise<string[]>;

  /**
   * Check if the publisher is connected and ready
   */
  isConnected(): boolean;

  /**
   * Close the connection gracefully
   */
  disconnect(): Promise<void>;
}

/**
 * Message to be published
 */
export interface PublishMessage {
  topic: string;
  message: unknown;
  metadata?: PublishMetadata;
}

/**
 * Metadata for message publishing
 */
export interface PublishMetadata {
  routingKey?: string;
  headers?: Record<string, string | number | boolean>;
  correlationId?: string;
  messageId?: string;
  timestamp?: number;
  contentType?: string;
  contentEncoding?: string;
  priority?: number;
  expiration?: number;
  persistent?: boolean;
  aggregateId?: string; // For consistent hashing
  companyId?: string; // For multi-tenancy
}

/**
 * Message subscriber interface for consuming messages
 */
export interface IMessageSubscriber {
  /**
   * Subscribe to a topic/queue with a handler
   * @param topic - The topic or queue name
   * @param handler - Function to handle incoming messages
   * @param options - Subscription options
   */
  subscribe(
    topic: string,
    handler: MessageHandler,
    options?: SubscribeOptions
  ): Promise<void>;

  /**
   * Unsubscribe from a topic/queue
   * @param topic - The topic or queue name
   */
  unsubscribe(topic: string): Promise<void>;
}

/**
 * Handler function for incoming messages
 */
export type MessageHandler = (message: IncomingMessage) => Promise<void> | void;

/**
 * Incoming message structure
 */
export interface IncomingMessage {
  content: unknown;
  metadata: PublishMetadata;
  ack: () => void;
  nack: (requeue?: boolean) => void;
  reject: (requeue?: boolean) => void;
}

/**
 * Subscription options
 */
export interface SubscribeOptions {
  prefetchCount?: number;
  noAck?: boolean;
  exclusive?: boolean;
  durable?: boolean;
  autoDelete?: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  messageTtl?: number;
  maxRetries?: number;
}
