export * from './get-language.query';
export * from './list-languages.query';

import { GetLanguageHandler } from './get-language.query';
import { ListLanguagesHandler } from './list-languages.query';

export const LanguageQueryHandlers = [
  GetLanguageHandler,
  ListLanguagesHandler,
];
