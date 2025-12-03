import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBoardAggregateStore,
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
export class DeleteBoardHandler implements ICommandHandler<DeleteBoardCommand> {
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IBoardAggregateStore
  ) {}

  async execute(command: DeleteBoardCommand): Promise<void> {
    const board = await this.boardStore.load(command.boardId);
    if (!board) {
      throw new NotFoundException(`Board ${command.boardId} not found`);
    }

    if (board.getState().ownerId !== command.userId) {
      throw new ForbiddenException('Only the owner can delete the board');
    }

    board.delete(command.userId);

    await this.boardStore.save(board);
  }
}
