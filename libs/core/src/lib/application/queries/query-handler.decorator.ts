import 'reflect-metadata';
import { IQuery } from './query.interface';

export const QUERY_HANDLER_METADATA = Symbol('QUERY_HANDLER_METADATA');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryConstructor<T extends IQuery = IQuery> = new (...args: any[]) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor = new (...args: any[]) => object;

/**
 * Decorator for query handlers
 * @param query The query class this handler handles
 */
export function QueryHandler<T extends IQuery>(
  query: QueryConstructor<T>
): <TClass extends Constructor>(target: TClass) => TClass {
  return <TClass extends Constructor>(target: TClass): TClass => {
    Reflect.defineMetadata(QUERY_HANDLER_METADATA, query, target);
    return target;
  };
}

/**
 * Gets the query type from a handler class
 * @param target The handler class
 */
export function getQueryMetadata(target: object): QueryConstructor | undefined {
  return Reflect.getMetadata(QUERY_HANDLER_METADATA, target);
}
