import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBoardAggregateStore,
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
export class UpdateBoardHandler implements ICommandHandler<UpdateBoardCommand> {
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IBoardAggregateStore
  ) {}

  async execute(command: UpdateBoardCommand): Promise<void> {
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
  }
}
