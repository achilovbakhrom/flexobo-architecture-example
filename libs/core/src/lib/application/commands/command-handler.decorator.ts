import 'reflect-metadata';
import { ICommand } from './command.interface';

export const COMMAND_HANDLER_METADATA = Symbol('COMMAND_HANDLER_METADATA');

export type CommandConstructor<T extends ICommand = ICommand> = new (
  ...args: unknown[]
) => T;

/**
 * Decorator for command handlers
 * @param command The command class this handler handles
 */
export function CommandHandler<T extends ICommand>(
  command: CommandConstructor<T>
): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
  };
}

/**
 * Gets the command type from a handler class
 * @param target The handler class
 */
export function getCommandMetadata(
  target: object
): CommandConstructor | undefined {
  return Reflect.getMetadata(COMMAND_HANDLER_METADATA, target);
}
