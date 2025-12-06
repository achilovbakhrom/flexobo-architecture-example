import { QueryHandler, IQueryHandler } from '@flexobo/core';
import { Inject } from '@nestjs/common';
import {
  GetRoomByIdQuery,
  GetRoomByParticipantsQuery,
  GetRoomByIdentifierQuery,
  GetUserRoomsQuery,
  CountUserRoomsQuery,
  GetUserUnreadStatsQuery,
} from './chat.queries';
import {
  IChatRoomRepository,
  CHAT_ROOM_REPOSITORY,
  ChatRoomReadModelDto,
} from '../../ports/chat-room.port';

@QueryHandler(GetRoomByIdQuery)
export class GetRoomByIdHandler
  implements IQueryHandler<GetRoomByIdQuery, ChatRoomReadModelDto | null>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository
  ) {}

  async execute(query: GetRoomByIdQuery): Promise<ChatRoomReadModelDto | null> {
    return this.roomRepository.findById(query.roomId);
  }
}

@QueryHandler(GetRoomByParticipantsQuery)
export class GetRoomByParticipantsHandler
  implements IQueryHandler<GetRoomByParticipantsQuery, ChatRoomReadModelDto | null>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository
  ) {}

  async execute(query: GetRoomByParticipantsQuery): Promise<ChatRoomReadModelDto | null> {
    return this.roomRepository.findByParticipants(query.participantIds);
  }
}

@QueryHandler(GetRoomByIdentifierQuery)
export class GetRoomByIdentifierHandler
  implements IQueryHandler<GetRoomByIdentifierQuery, ChatRoomReadModelDto | null>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository
  ) {}

  async execute(query: GetRoomByIdentifierQuery): Promise<ChatRoomReadModelDto | null> {
    return this.roomRepository.findByIdentifier(query.identifierId, query.identifierType);
  }
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    totalRecords: number;
    currentPage: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
  };
}

@QueryHandler(GetUserRoomsQuery)
export class GetUserRoomsHandler
  implements IQueryHandler<GetUserRoomsQuery, PaginatedResult<ChatRoomReadModelDto>>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository
  ) {}

  async execute(query: GetUserRoomsQuery): Promise<PaginatedResult<ChatRoomReadModelDto>> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const [rooms, totalRecords] = await Promise.all([
      this.roomRepository.findByUserId(query.userId, {
        limit,
        offset: (page - 1) * limit,
        includeArchived: query.includeArchived,
      }),
      this.roomRepository.countByUserId(query.userId, query.includeArchived),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: rooms,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }
}

@QueryHandler(CountUserRoomsQuery)
export class CountUserRoomsHandler
  implements IQueryHandler<CountUserRoomsQuery, number>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository
  ) {}

  async execute(query: CountUserRoomsQuery): Promise<number> {
    return this.roomRepository.countByUserId(query.userId, query.includeArchived);
  }
}

export interface UnreadStatsResult {
  totalUnreadChats: number;
  unreadDetails: Array<{ roomId: string; unreadCount: number }>;
}

@QueryHandler(GetUserUnreadStatsQuery)
export class GetUserUnreadStatsHandler
  implements IQueryHandler<GetUserUnreadStatsQuery, UnreadStatsResult>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository
  ) {}

  async execute(query: GetUserUnreadStatsQuery): Promise<UnreadStatsResult> {
    const rooms = await this.roomRepository.findByUserId(query.userId, {
      limit: 1000, // Get all rooms to check unread counts
      offset: 0,
      includeArchived: false,
    });

    const unreadDetails: Array<{ roomId: string; unreadCount: number }> = [];

    for (const room of rooms) {
      const count = room.unreadCounts[query.userId] || 0;
      if (count > 0) {
        unreadDetails.push({ roomId: room.id, unreadCount: count });
      }
    }

    return {
      totalUnreadChats: unreadDetails.length,
      unreadDetails,
    };
  }
}
