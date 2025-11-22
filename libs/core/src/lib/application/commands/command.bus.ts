import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  ICommand,
  ICommandHandler,
  Result,
  Failure,
} from './command.interface';
import { getCommandMetadata } from './command-handler.decorator';

@Injectable()
export class CommandBus implements OnModuleInit {
  private handlers = new Map<string, ICommandHandler<ICommand, unknown>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    // Handlers will be registered by the module
  }

  /**
   * Registers a command handler
   * @param handler The handler class
   */
  register<T extends ICommand>(
    handler: Type<ICommandHandler<T, unknown>>
  ): void {
    const command = getCommandMetadata(handler);
    if (!command) {
      throw new Error(
        `Handler ${handler.name} is not decorated with @CommandHandler`
      );
    }

    const instance = this.moduleRef.get(handler, { strict: false });
    this.handlers.set(
      command.name,
      instance as ICommandHandler<ICommand, unknown>
    );
  }

  /**
   * Executes a command
   * @param command The command to execute
   */
  async execute<TResult>(command: ICommand): Promise<Result<TResult, Error>> {
    const commandName = command.constructor.name;
    const handler = this.handlers.get(commandName);

    if (!handler) {
      return new Failure(
        new Error(`No handler registered for command: ${commandName}`)
      );
    }

    try {
      return (await handler.execute(command)) as Result<TResult, Error>;
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
