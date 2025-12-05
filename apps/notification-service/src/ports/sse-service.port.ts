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

export interface ISSEManager {
  addConnection(userId: string, response: Response): void;
  removeConnection(userId: string, response: Response): void;
  sendToUser(userId: string, payload: SSEPayload): Promise<void>;
  sendToUsers(userIds: string[], payload: SSEPayload): Promise<void>;
  broadcast(payload: SSEPayload): Promise<void>;
  getConnectedUserCount(): number;
  isUserConnected(userId: string): boolean;
}
