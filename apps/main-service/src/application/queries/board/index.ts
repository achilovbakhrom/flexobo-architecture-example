export * from './get-board.query';
export * from './list-boards.query';
export * from './list-invited-boards.query';

import { GetBoardHandler } from './get-board.query';
import { ListBoardsHandler } from './list-boards.query';
import { ListInvitedBoardsHandler } from './list-invited-boards.query';

export const BoardQueryHandlers = [
  GetBoardHandler,
  ListBoardsHandler,
  ListInvitedBoardsHandler,
];
