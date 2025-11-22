import { Module, Global, DynamicModule, Type } from '@nestjs/common';
import { CommandBus } from './commands/command.bus';
import { QueryBus } from './queries/query.bus';
import { ICommandHandler, ICommand } from './commands/command.interface';
import { IQueryHandler, IQuery } from './queries/query.interface';

export interface CqrsModuleOptions {
  commandHandlers?: Type<ICommandHandler<ICommand, unknown>>[];
  queryHandlers?: Type<IQueryHandler<IQuery, unknown>>[];
}

@Global()
@Module({})
export class CqrsModule {
  static forRoot(options: CqrsModuleOptions = {}): DynamicModule {
    const commandHandlers = options.commandHandlers || [];
    const queryHandlers = options.queryHandlers || [];

    return {
      module: CqrsModule,
      providers: [
        CommandBus,
        QueryBus,
        ...commandHandlers,
        ...queryHandlers,
        {
          provide: 'COMMAND_HANDLERS',
          useFactory: (commandBus: CommandBus) => {
            commandHandlers.forEach((handler) => commandBus.register(handler));
            return commandHandlers;
          },
          inject: [CommandBus],
        },
        {
          provide: 'QUERY_HANDLERS',
          useFactory: (queryBus: QueryBus) => {
            queryHandlers.forEach((handler) => queryBus.register(handler));
            return queryHandlers;
          },
          inject: [QueryBus],
        },
      ],
      exports: [CommandBus, QueryBus],
    };
  }
}
