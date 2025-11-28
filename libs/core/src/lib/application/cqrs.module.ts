import { Module, Global, DynamicModule, Type, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { CommandBus } from './commands/command.bus';
import { QueryBus } from './queries/query.bus';
import { ICommandHandler, ICommand } from './commands/command.interface';
import { IQueryHandler, IQuery } from './queries/query.interface';

export interface CqrsModuleOptions {
  commandHandlers?: Type<ICommandHandler<ICommand, unknown>>[];
  queryHandlers?: Type<IQueryHandler<IQuery, unknown>>[];
}

export const CQRS_COMMAND_HANDLERS = 'CQRS_COMMAND_HANDLERS';
export const CQRS_QUERY_HANDLERS = 'CQRS_QUERY_HANDLERS';

@Global()
@Module({})
export class CqrsModule implements OnModuleInit {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Optional() @Inject(CQRS_COMMAND_HANDLERS) private readonly commandHandlers: Type<ICommandHandler<ICommand, unknown>>[] = [],
    @Optional() @Inject(CQRS_QUERY_HANDLERS) private readonly queryHandlers: Type<IQueryHandler<IQuery, unknown>>[] = [],
  ) {}

  onModuleInit() {
    this.commandHandlers.forEach((handler) => this.commandBus.register(handler));
    this.queryHandlers.forEach((handler) => this.queryBus.register(handler));
  }

  static forRoot(options: CqrsModuleOptions = {}): DynamicModule {
    const commandHandlers = options.commandHandlers || [];
    const queryHandlers = options.queryHandlers || [];

    return {
      module: CqrsModule,
      providers: [
        CommandBus,
        QueryBus,
        {
          provide: CQRS_COMMAND_HANDLERS,
          useValue: commandHandlers,
        },
        {
          provide: CQRS_QUERY_HANDLERS,
          useValue: queryHandlers,
        },
      ],
      exports: [CommandBus, QueryBus, CQRS_COMMAND_HANDLERS, CQRS_QUERY_HANDLERS],
    };
  }
}
