export const CHAT_SERVICE_CLIENT = Symbol('CHAT_SERVICE_CLIENT');

export interface CreateChatRoomResponse {
  roomId: string;
}

export interface IChatServiceClient {
  createChatRoom(
    participantIds: string[],
    identifierId: string,
    identifierType: string
  ): Promise<CreateChatRoomResponse>;
}
