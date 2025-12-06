export * from './create-load.command';
export * from './update-load.command';
export * from './activate-load.command';
export * from './delete-load.command';

import { CreateLoadHandler } from './create-load.command';
import { UpdateLoadHandler } from './update-load.command';
import { ActivateLoadHandler } from './activate-load.command';
import { DeleteLoadHandler } from './delete-load.command';

export const LoadCommandHandlers = [
  CreateLoadHandler,
  UpdateLoadHandler,
  ActivateLoadHandler,
  DeleteLoadHandler,
];
