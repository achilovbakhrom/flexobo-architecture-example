import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Board } from '../../../domain/aggregates/board.aggregate';
import {
  BOARD_AGGREGATE_STORE,
} from '../../../ports/board.repository';

export class DeleteBoardCommand implements ICommand {
  constructor(
    public readonly boardId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(DeleteBoardCommand)
export class DeleteBoardHandler implements ICommandHandler<DeleteBoardCommand, void> {
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IAggregateStore<Board>
  ) {}

  async execute(command: DeleteBoardCommand): Promise<Result<void, Error>> {
    try {
      const board = await this.boardStore.load(command.boardId);
      if (!board) {
        throw new NotFoundException(`Board ${command.boardId} not found`);
      }

      if (board.getState().ownerId !== command.userId) {
        throw new ForbiddenException('Only the owner can delete the board');
      }

      board.delete(command.userId);

      await this.boardStore.save(board);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
