import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Board } from '../../../domain/aggregates/board.aggregate';
import {
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
  implements ICommandHandler<AddBoardMemberCommand, void>
{
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IAggregateStore<Board>
  ) {}

  async execute(command: AddBoardMemberCommand): Promise<Result<void, Error>> {
    try {
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

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
