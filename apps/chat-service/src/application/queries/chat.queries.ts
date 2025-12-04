import { IQuery } from '@flexobo/core';

export class GetRoomByIdQuery implements IQuery {
  constructor(public readonly roomId: string) {}
}

export class GetRoomByParticipantsQuery implements IQuery {
  constructor(public readonly participantIds: string[]) {}
}

export class GetRoomByIdentifierQuery implements IQuery {
  constructor(
    public readonly identifierId: string,
    public readonly identifierType: string
  ) {}
}

export class GetUserRoomsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page?: number,
    public readonly limit?: number,
    public readonly includeArchived?: boolean
  ) {}
}

export class CountUserRoomsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly includeArchived?: boolean
  ) {}
}

export class GetMessageByIdQuery implements IQuery {
  constructor(public readonly messageId: string) {}
}

export class GetRoomMessagesQuery implements IQuery {
  constructor(
    public readonly roomId: string,
    public readonly page?: number,
    public readonly limit?: number,
    public readonly beforeId?: string,
    public readonly afterId?: string
  ) {}
}

export class CountRoomMessagesQuery implements IQuery {
  constructor(public readonly roomId: string) {}
}

export class CountUnreadMessagesQuery implements IQuery {
  constructor(
    public readonly roomId: string,
    public readonly userId: string
  ) {}
}

export class GetUserUnreadStatsQuery implements IQuery {
  constructor(public readonly userId: string) {}
}
