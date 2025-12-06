import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  IBoardReadRepository,
  BoardReadDto,
  BoardFilters,
  BOARD_READ_REPOSITORY,
} from '../../../ports/board.repository';

export class ListBoardsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly filters?: BoardFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListBoardsResult {
  data: BoardReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(ListBoardsQuery)
export class ListBoardsHandler implements IQueryHandler<ListBoardsQuery> {
  constructor(
    @Inject(BOARD_READ_REPOSITORY)
    private readonly boardRepo: IBoardReadRepository
  ) {}

  async execute(query: ListBoardsQuery): Promise<ListBoardsResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: BoardFilters = {
      ...query.filters,
      offset,
      limit: query.limit,
    };

    // Get boards user owns and boards user is a member of
    const [ownedBoards, memberBoards, ownedCount, memberCount] =
      await Promise.all([
        this.boardRepo.findByOwner(query.userId, filters),
        this.boardRepo.findByMember(query.userId, filters),
        this.boardRepo.countByOwner(query.userId, query.filters),
        this.boardRepo.countByMember(query.userId, query.filters),
      ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const data = [...ownedBoards, ...memberBoards].filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    const total = ownedCount + memberCount;

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
