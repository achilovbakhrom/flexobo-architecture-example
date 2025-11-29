import 'reflect-metadata';
import { ICommand } from './command.interface';

export const COMMAND_HANDLER_METADATA = Symbol('COMMAND_HANDLER_METADATA');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandConstructor<T extends ICommand = ICommand> = new (...args: any[]) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor = new (...args: any[]) => object;

/**
 * Decorator for command handlers
 * @param command The command class this handler handles
 */
export function CommandHandler<T extends ICommand>(
  command: CommandConstructor<T>
): <TClass extends Constructor>(target: TClass) => TClass {
  return <TClass extends Constructor>(target: TClass): TClass => {
    Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
    return target;
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
