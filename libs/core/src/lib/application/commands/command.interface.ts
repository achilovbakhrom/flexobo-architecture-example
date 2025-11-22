/**
 * Marker interface for all commands
 * Commands represent intentions to change state
 */
export interface ICommand {}

/**
 * Result wrapper for operations
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
  readonly isSuccess = true;
  readonly isFailure = false;

  constructor(public readonly value: T) {}
}

export class Failure<E> {
  readonly isSuccess = false;
  readonly isFailure = true;

  constructor(public readonly error: E) {}
}

/**
 * Handler interface for commands
 */
export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<Result<TResult, Error>>;
}
