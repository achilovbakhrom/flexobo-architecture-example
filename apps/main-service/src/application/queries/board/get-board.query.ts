import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IBoardReadRepository,
  BoardReadDto,
  BOARD_READ_REPOSITORY,
} from '../../../ports/board.repository';

export class GetBoardQuery implements IQuery {
  constructor(public readonly boardId: string) {}
}

@Injectable()
@QueryHandler(GetBoardQuery)
export class GetBoardHandler implements IQueryHandler<GetBoardQuery> {
  constructor(
    @Inject(BOARD_READ_REPOSITORY)
    private readonly boardRepo: IBoardReadRepository
  ) {}

  async execute(query: GetBoardQuery): Promise<BoardReadDto> {
    const board = await this.boardRepo.findById(query.boardId);
    if (!board) {
      throw new NotFoundException(`Board ${query.boardId} not found`);
    }
    return board;
  }
}
