import 'reflect-metadata';
import { IQuery } from './query.interface';

export const QUERY_HANDLER_METADATA = Symbol('QUERY_HANDLER_METADATA');

export type QueryConstructor<T extends IQuery = IQuery> = new (
  ...args: unknown[]
) => T;

/**
 * Decorator for query handlers
 * @param query The query class this handler handles
 */
export function QueryHandler<T extends IQuery>(
  query: QueryConstructor<T>
): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(QUERY_HANDLER_METADATA, query, target);
  };
}

/**
 * Gets the query type from a handler class
 * @param target The handler class
 */
export function getQueryMetadata(target: object): QueryConstructor | undefined {
  return Reflect.getMetadata(QUERY_HANDLER_METADATA, target);
}
