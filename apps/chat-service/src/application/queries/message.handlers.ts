import { QueryHandler, IQueryHandler } from '@flexobo/core';
import { Inject } from '@nestjs/common';
import {
  GetMessageByIdQuery,
  GetRoomMessagesQuery,
  CountRoomMessagesQuery,
  CountUnreadMessagesQuery,
} from './chat.queries';
import {
  IChatMessageRepository,
  CHAT_MESSAGE_REPOSITORY,
  ChatMessageReadModelDto,
} from '../../ports/chat-message.port';
import { PaginatedResult } from './room.handlers';

@QueryHandler(GetMessageByIdQuery)
export class GetMessageByIdHandler
  implements IQueryHandler<GetMessageByIdQuery, ChatMessageReadModelDto | null>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository
  ) {}

  async execute(query: GetMessageByIdQuery): Promise<ChatMessageReadModelDto | null> {
    return this.messageRepository.findById(query.messageId);
  }
}

@QueryHandler(GetRoomMessagesQuery)
export class GetRoomMessagesHandler
  implements IQueryHandler<GetRoomMessagesQuery, PaginatedResult<ChatMessageReadModelDto>>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository
  ) {}

  async execute(query: GetRoomMessagesQuery): Promise<PaginatedResult<ChatMessageReadModelDto>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const [messages, totalRecords] = await Promise.all([
      this.messageRepository.findByRoomId(query.roomId, {
        limit,
        offset: query.beforeId || query.afterId ? 0 : (page - 1) * limit,
        beforeId: query.beforeId,
        afterId: query.afterId,
      }),
      this.messageRepository.countByRoomId(query.roomId),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: messages,
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

@QueryHandler(CountRoomMessagesQuery)
export class CountRoomMessagesHandler
  implements IQueryHandler<CountRoomMessagesQuery, number>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository
  ) {}

  async execute(query: CountRoomMessagesQuery): Promise<number> {
    return this.messageRepository.countByRoomId(query.roomId);
  }
}

@QueryHandler(CountUnreadMessagesQuery)
export class CountUnreadMessagesHandler
  implements IQueryHandler<CountUnreadMessagesQuery, number>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository
  ) {}

  async execute(query: CountUnreadMessagesQuery): Promise<number> {
    return this.messageRepository.countUnreadByRoomAndUser(query.roomId, query.userId);
  }
}
