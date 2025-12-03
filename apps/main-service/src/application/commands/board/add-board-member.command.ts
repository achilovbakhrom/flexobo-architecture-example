import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBoardAggregateStore,
  BOARD_AGGREGATE_STORE,
} from '../../../ports/board.repository';

export class AddBoardMemberCommand implements ICommand {
  constructor(
    public readonly boardId: string,
    public readonly userId: string,
    public readonly memberId: string,
    public readonly role: string
  ) {}
}

@Injectable()
@CommandHandler(AddBoardMemberCommand)
export class AddBoardMemberHandler
  implements ICommandHandler<AddBoardMemberCommand>
{
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IBoardAggregateStore
  ) {}

  async execute(command: AddBoardMemberCommand): Promise<void> {
    const board = await this.boardStore.load(command.boardId);
    if (!board) {
      throw new NotFoundException(`Board ${command.boardId} not found`);
    }

    // Only owner or admins can add members
    if (board.getState().ownerId !== command.userId) {
      throw new ForbiddenException('Only the owner can add members');
    }

    board.addMember(command.memberId, command.role as 'ADMIN' | 'MEMBER' | 'VIEWER', command.userId);

    await this.boardStore.save(board);
  }
}
