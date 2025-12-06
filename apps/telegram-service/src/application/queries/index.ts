import { GetPublicationHandler } from './get-publication.query';
import { GetTelegramUserHandler } from './get-telegram-user.query';

export * from './get-publication.query';
export * from './get-telegram-user.query';

export const QueryHandlers = [
  GetPublicationHandler,
  GetTelegramUserHandler,
];
