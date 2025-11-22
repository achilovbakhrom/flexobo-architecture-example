import { DomainEvent } from '../../domain';

/**
 * Handler interface for domain events
 */
export interface IEventHandler<TEvent extends DomainEvent = DomainEvent> {
  handle(event: TEvent): Promise<void>;
}
