import { Injectable, Inject } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import { Board } from '../../../domain/aggregates/board.aggregate';
import {
  BOARD_AGGREGATE_STORE,
} from '../../../ports/board.repository';

export class CreateBoardCommand implements ICommand {
  constructor(
    public readonly ownerId: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly description?: string
  ) {}
}

@Injectable()
@CommandHandler(CreateBoardCommand)
export class CreateBoardHandler implements ICommandHandler<CreateBoardCommand, string> {
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IAggregateStore<Board>
  ) {}

  async execute(command: CreateBoardCommand): Promise<Result<string, Error>> {
    try {
      const boardId = uuidv4();

      const board = Board.create(boardId, {
        ownerId: command.ownerId,
        companyId: command.companyId,
        name: command.name,
        description: command.description,
      });

      await this.boardStore.save(board);

      return new Success(boardId);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
