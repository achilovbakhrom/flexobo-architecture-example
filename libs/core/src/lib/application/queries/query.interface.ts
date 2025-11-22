/**
 * Marker interface for all queries
 * Queries represent requests for data without side effects
 */
export interface IQuery<TResult = unknown> {
  // Marker interface
}

/**
 * Handler interface for queries
 */
export interface IQueryHandler<
  TQuery extends IQuery<TResult>,
  TResult = unknown
> {
  execute(query: TQuery): Promise<TResult>;
}
