import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IQuery, IQueryHandler } from './query.interface';
import { getQueryMetadata } from './query-handler.decorator';

@Injectable()
export class QueryBus implements OnModuleInit {
  private handlers = new Map<string, IQueryHandler<IQuery, unknown>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    // Handlers will be registered by the module
  }

  /**
   * Registers a query handler
   * @param handler The handler class
   */
  register<T extends IQuery>(handler: Type<IQueryHandler<T, unknown>>): void {
    const query = getQueryMetadata(handler);
    if (!query) {
      throw new Error(
        `Handler ${handler.name} is not decorated with @QueryHandler`
      );
    }

    const instance = this.moduleRef.get(handler, { strict: false });
    this.handlers.set(query.name, instance as IQueryHandler<IQuery, unknown>);
  }

  /**
   * Executes a query
   * @param query The query to execute
   */
  async execute<TResult>(query: IQuery<TResult>): Promise<TResult> {
    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);

    if (!handler) {
      throw new Error(`No handler registered for query: ${queryName}`);
    }

    return (await handler.execute(query)) as TResult;
  }
}
