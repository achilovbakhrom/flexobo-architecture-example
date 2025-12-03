import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBoardAggregateStore,
  BOARD_AGGREGATE_STORE,
} from '../../../ports/board.repository';

export class RemoveBoardMemberCommand implements ICommand {
  constructor(
    public readonly boardId: string,
    public readonly userId: string,
    public readonly memberId: string
  ) {}
}

@Injectable()
@CommandHandler(RemoveBoardMemberCommand)
export class RemoveBoardMemberHandler
  implements ICommandHandler<RemoveBoardMemberCommand>
{
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IBoardAggregateStore
  ) {}

  async execute(command: RemoveBoardMemberCommand): Promise<void> {
    const board = await this.boardStore.load(command.boardId);
    if (!board) {
      throw new NotFoundException(`Board ${command.boardId} not found`);
    }

    // Only owner can remove members (or member can remove themselves)
    if (
      board.getState().ownerId !== command.userId &&
      command.userId !== command.memberId
    ) {
      throw new ForbiddenException('Only the owner can remove members');
    }

    board.removeMember(command.memberId, command.userId);

    await this.boardStore.save(board);
  }
}
