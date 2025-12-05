import { Response } from 'express';

export const SSE_MANAGER = Symbol('SSE_MANAGER');

export interface SSEPayload {
  type: string;
  category?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  correlationId?: string;
  timestamp?: number;
}

export interface DisconnectReason {
  reason: 'new_connection' | 'max_duration' | 'server_shutdown' | 'error';
  message?: string;
}

export interface ISSEManager {
  /**
   * Adds a connection for a user. If user already has a connection,
   * the old one is closed gracefully before adding the new one.
   * Returns true if a previous connection was replaced.
   */
  addConnection(userId: string, response: Response): boolean;

  /**
   * Removes a specific connection for a user.
   */
  removeConnection(userId: string, response: Response): void;

  /**
   * Send payload to a specific user across all service instances.
   */
  sendToUser(userId: string, payload: SSEPayload): Promise<void>;

  /**
   * Send payload to multiple users across all service instances.
   */
  sendToUsers(userIds: string[], payload: SSEPayload): Promise<void>;

  /**
   * Broadcast payload to all connected users across all service instances.
   */
  broadcast(payload: SSEPayload): Promise<void>;

  /**
   * Returns the number of unique users connected to this instance.
   */
  getConnectedUserCount(): number;

  /**
   * Checks if a user is connected to this instance.
   */
  isUserConnected(userId: string): boolean;
}
