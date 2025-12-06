export * from './create-language.command';
export * from './update-language.command';
export * from './delete-language.command';

import { CreateLanguageHandler } from './create-language.command';
import { UpdateLanguageHandler } from './update-language.command';
import { DeleteLanguageHandler } from './delete-language.command';

export const LanguageCommandHandlers = [
  CreateLanguageHandler,
  UpdateLanguageHandler,
  DeleteLanguageHandler,
];
