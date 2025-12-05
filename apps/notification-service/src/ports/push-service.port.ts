export const PUSH_SERVICE = Symbol('PUSH_SERVICE');

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface IPushService {
  sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void>;
  sendToAll(payload: PushNotificationPayload): Promise<void>;
  sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<void>;
}
