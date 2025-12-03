import { Module, Global, DynamicModule, Type, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { CommandBus } from './commands/command.bus';
import { QueryBus } from './queries/query.bus';
import { ICommandHandler, ICommand } from './commands/command.interface';
import { IQueryHandler, IQuery } from './queries/query.interface';

export interface CqrsModuleOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commandHandlers?: Type<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryHandlers?: Type<any>[];
}

export const CQRS_COMMAND_HANDLERS = 'CQRS_COMMAND_HANDLERS';
export const CQRS_QUERY_HANDLERS = 'CQRS_QUERY_HANDLERS';

@Global()
@Module({})
export class CqrsModule implements OnModuleInit {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Optional() @Inject(CQRS_COMMAND_HANDLERS) private readonly commandHandlers: Type<any>[] = [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Optional() @Inject(CQRS_QUERY_HANDLERS) private readonly queryHandlers: Type<any>[] = [],
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
