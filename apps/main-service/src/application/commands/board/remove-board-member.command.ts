import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Board } from '../../../domain/aggregates/board.aggregate';
import {
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
  implements ICommandHandler<RemoveBoardMemberCommand, void>
{
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IAggregateStore<Board>
  ) {}

  async execute(command: RemoveBoardMemberCommand): Promise<Result<void, Error>> {
    try {
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

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
