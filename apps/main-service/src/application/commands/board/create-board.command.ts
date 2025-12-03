import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { Board } from '../../../domain/aggregates/board.aggregate';
import {
  IBoardAggregateStore,
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
export class CreateBoardHandler implements ICommandHandler<CreateBoardCommand> {
  constructor(
    @Inject(BOARD_AGGREGATE_STORE)
    private readonly boardStore: IBoardAggregateStore
  ) {}

  async execute(command: CreateBoardCommand): Promise<string> {
    const boardId = uuidv4();

    const board = Board.create(boardId, {
      ownerId: command.ownerId,
      companyId: command.companyId,
      name: command.name,
      description: command.description,
    });

    await this.boardStore.save(board);

    return boardId;
  }
}
