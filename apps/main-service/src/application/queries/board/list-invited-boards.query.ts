import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  IBoardReadRepository,
  BOARD_READ_REPOSITORY,
  BoardReadDto,
} from '../../../ports/board.repository';

export class ListInvitedBoardsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface InvitedBoardsResult {
  data: Array<BoardReadDto & { memberRole: string; joinedAt: Date }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListInvitedBoardsQuery)
export class ListInvitedBoardsHandler
  implements IQueryHandler<ListInvitedBoardsQuery, InvitedBoardsResult>
{
  constructor(
    @Inject(BOARD_READ_REPOSITORY)
    private readonly boardRepo: IBoardReadRepository
  ) {}

  async execute(query: ListInvitedBoardsQuery): Promise<InvitedBoardsResult> {
    const offset = (query.page - 1) * query.limit;

    // Find boards where user is a member
    const [boards, total] = await Promise.all([
      this.boardRepo.findByMember(query.userId, { offset, limit: query.limit }),
      this.boardRepo.countByMember(query.userId),
    ]);

    // Filter out boards owned by the user (keep only invited ones)
    const invitedBoards = boards.filter((board: BoardReadDto) => board.ownerId !== query.userId);

    // Enrich with member info
    const enrichedBoards = invitedBoards.map((board: BoardReadDto) => {
      const members = board.members as Array<{ userId: string; role: string; joinedAt?: string }>;
      const memberInfo = members.find((m) => m.userId === query.userId);

      return {
        ...board,
        memberRole: memberInfo?.role || 'MEMBER',
        joinedAt: memberInfo?.joinedAt ? new Date(memberInfo.joinedAt) : new Date(),
      };
    });

    return {
      data: enrichedBoards,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
