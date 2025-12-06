import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Board } from '../../../domain/aggregates/board.aggregate';
import {
  BOARD_AGGREGATE_STORE,
} from '../../../ports/board.repository';

export class UpdateBoardCommand implements ICommand {
  constructor(
    public readonly boardId: string,
    public readonly userId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly isActive?: boolean
  ) {}
}

@Injectable()
@CommandHandler(UpdateBoardCommand)
export class UpdateBoardHandler implements ICommandHandler<UpdateBoardCommand, void> {
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IAggregateStore<Board>
  ) {}

  async execute(command: UpdateBoardCommand): Promise<Result<void, Error>> {
    try {
      const board = await this.boardStore.load(command.boardId);
      if (!board) {
        throw new NotFoundException(`Board ${command.boardId} not found`);
      }

      if (board.getState().ownerId !== command.userId) {
        throw new ForbiddenException('Only the owner can update the board');
      }

      board.update({
        name: command.name,
        description: command.description,
        isActive: command.isActive,
      });

      await this.boardStore.save(board);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
